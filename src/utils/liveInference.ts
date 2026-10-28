import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

let modelPromise: Promise<cocoSsd.ObjectDetection> | null = null;

export async function loadCocoModel(): Promise<cocoSsd.ObjectDetection> {
  if (!modelPromise) {
    modelPromise = (async () => {
      await tf.ready();
      return await cocoSsd.load({
        base: 'lite_mobilenet_v2', // Lightweight & fast for 30-60fps mobile camera inference
      });
    })();
  }
  return modelPromise;
}

export interface LiveDetectionResult {
  bbox: [number, number, number, number]; // [x, y, width, height]
  class: string;
  score: number;
}

export async function detectVideoFrame(
  video: HTMLVideoElement,
  confThreshold: number,
  targetClasses: string[]
): Promise<LiveDetectionResult[]> {
  try {
    const model = await loadCocoModel();
    if (!video || video.readyState < 2) return [];

    const predictions = await model.detect(video, 10, confThreshold);
    
    if (targetClasses.length === 0) {
      return predictions;
    }

    // Filter by user prompt classes if specified
    const filtered = predictions.filter((pred) => {
      const predClass = pred.class.toLowerCase();
      return targetClasses.some(
        (target) => predClass.includes(target.toLowerCase()) || target.toLowerCase().includes(predClass)
      );
    });

    return filtered;
  } catch (err) {
    console.warn('Real-time frame detection error:', err);
    return [];
  }
}
