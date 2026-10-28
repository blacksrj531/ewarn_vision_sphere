import { pipeline, env } from '@huggingface/transformers';
import type { BoundingBox } from '../types';
import { loadCocoModel } from './liveInference';

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
    if (onProgress) onProgress(10, 'Initializing neural network weights...');
    
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

// Ultra-fast in-browser image inference via TFJS/COCO-SSD
async function runCocoImageInference(
  imageSrc: string,
  userPrompt: string,
  confThreshold: number
): Promise<BoundingBox[]> {
  try {
    const model = await loadCocoModel();
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    await new Promise((resolve, reject) => {
      if (img.complete) {
        resolve(true);
      } else {
        img.onload = () => resolve(true);
        img.onerror = reject;
      }
    });

    const predictions = await model.detect(img, 20, 0.15);
    const promptClasses = userPrompt
      .toLowerCase()
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const detections: BoundingBox[] = [];
    const w = img.naturalWidth || img.width || 640;
    const h = img.naturalHeight || img.height || 480;

    predictions.forEach((item, idx) => {
      const conf = item.score;
      if (conf < confThreshold) return;

      const label = item.class.charAt(0).toUpperCase() + item.class.slice(1);
      if (promptClasses.length > 0) {
        const matches = promptClasses.some(
          (cls) => item.class.toLowerCase().includes(cls) || cls.includes(item.class.toLowerCase())
        );
        if (!matches) return;
      }

      const [bx, by, bw, bh] = item.bbox;
      detections.push({
        id: `coco-${idx}-${label}`,
        label,
        confidence: conf,
        x: bx / w,
        y: by / h,
        width: bw / w,
        height: bh / h,
        color: '#10b981',
      });
    });

    return detections;
  } catch (e) {
    console.warn('Coco inference fallback notice:', e);
    return [];
  }
}

export async function runRealInference(
  imageSrc: string,
  userPrompt: string,
  confThreshold: number,
  onProgress?: (progress: number, status: string) => void
): Promise<BoundingBox[]> {
  // 1. First run fast in-browser detection
  try {
    if (onProgress) onProgress(50, 'Running neural forward pass...');
    const fastResults = await runCocoImageInference(imageSrc, userPrompt, confThreshold);
    if (fastResults.length > 0) {
      if (onProgress) onProgress(100, 'Detection complete!');
      return fastResults;
    }
  } catch (err) {
    console.warn('Fast detection skipped:', err);
  }

  // 2. Transformer forward pass fallback
  try {
    const detector = await getDetector(onProgress);
    if (onProgress) onProgress(90, 'Running transformer forward pass on image...');

    const output = await detector(imageSrc, {
      threshold: 0.15,
      percentage: true,
    });

    const promptClasses = userPrompt
      .toLowerCase()
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const detections: BoundingBox[] = [];

    output.forEach((item: any, idx: number) => {
      const label = item.label.charAt(0).toUpperCase() + item.label.slice(1);
      const conf = item.score;

      if (conf < confThreshold) return;

      if (promptClasses.length > 0) {
        const matchesPrompt = promptClasses.some(
          (cls) => item.label.toLowerCase().includes(cls) || cls.includes(item.label.toLowerCase())
        );
        if (!matchesPrompt) return;
      }

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
