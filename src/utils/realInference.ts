import { pipeline, env } from '@huggingface/transformers';
import type { BoundingBox } from '../types';

// Configure transformers.js for optimal browser execution
env.allowLocalModels = false;
env.useBrowserCache = true;

let detectorPipeline: any = null;
let isModelLoading = false;

export async function getDetector(onProgress?: (progress: number, status: string) => void) {
  if (detectorPipeline) return detectorPipeline;

  if (isModelLoading) {
    while (isModelLoading) {
      await new Promise((r) => setTimeout(r, 200));
    }
    return detectorPipeline;
  }

  isModelLoading = true;
  try {
    if (onProgress) onProgress(10, 'Initializing zero-shot neural network weights...');
    
    // We use Xenova/detr-resnet-50 or Xenova/owlvit-base-patch32 for real in-browser neural detection
    detectorPipeline = await pipeline('object-detection', 'Xenova/detr-resnet-50', {
      progress_callback: (p: any) => {
        if (onProgress && p.status === 'progress') {
          onProgress(Math.round(p.progress || 50), `Downloading model tensor: ${Math.round(p.progress || 0)}%`);
        }
      },
    });

    if (onProgress) onProgress(100, 'Model neural engine ready!');
    return detectorPipeline;
  } catch (err) {
    console.error('Failed to load in-browser detector:', err);
    throw err;
  } finally {
    isModelLoading = false;
  }
}

export async function runRealInference(
  imageSrc: string,
  userPrompt: string,
  confThreshold: number,
  onProgress?: (progress: number, status: string) => void
): Promise<BoundingBox[]> {
  try {
    const detector = await getDetector(onProgress);
    if (onProgress) onProgress(90, 'Running neural forward pass on image...');

    // Run actual object detection on image pixels
    const output = await detector(imageSrc, {
      threshold: 0.15, // Low threshold to catch fine objects, filter with user slider
      percentage: true, // Output 0 to 1 relative coordinates
    });

    const promptClasses = userPrompt
      .toLowerCase()
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const detections: BoundingBox[] = [];

    // Map output to BoundingBox
    output.forEach((item: any, idx: number) => {
      const label = item.label.charAt(0).toUpperCase() + item.label.slice(1);
      const conf = item.score;

      // Filter by confidence threshold
      if (conf < confThreshold) return;

      // If user provided prompt classes, match against them
      if (promptClasses.length > 0) {
        const matchesPrompt = promptClasses.some(
          (cls) => item.label.toLowerCase().includes(cls) || cls.includes(item.label.toLowerCase())
        );
        if (!matchesPrompt) return;
      }

      // Convert box [xmin, ymin, xmax, ymax] to [x, y, width, height]
      const { xmin, ymin, xmax, ymax } = item.box;
      detections.push({
        id: `real-det-${idx}-${label}`,
        label: label,
        confidence: conf,
        x: xmin,
        y: ymin,
        width: xmax - xmin,
        height: ymax - ymin,
        color: '#10b981',
      });
    });

    return detections;
  } catch (error) {
    console.error('Error during real inference:', error);
    return [];
  }
}
