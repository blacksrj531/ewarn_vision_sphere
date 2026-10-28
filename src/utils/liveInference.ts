import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

let modelPromise: Promise<cocoSsd.ObjectDetection> | null = null;

// Initialize hardware acceleration (WebGPU -> WebGL -> WASM)
export async function initializeHardwareBackend(): Promise<string> {
  try {
    if (navigator.gpu) {
      try {
        await tf.setBackend('webgpu');
        await tf.ready();
        return 'webgpu';
      } catch {
        // Fallback to webgl
      }
    }
    await tf.setBackend('webgl');
    await tf.ready();
    return 'webgl';
  } catch {
    await tf.setBackend('cpu');
    await tf.ready();
    return 'cpu';
  }
}

export async function loadCocoModel(): Promise<cocoSsd.ObjectDetection> {
  if (!modelPromise) {
    modelPromise = (async () => {
      await initializeHardwareBackend();
      return await cocoSsd.load({
        base: 'lite_mobilenet_v2',
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

// Calculate Intersection-Over-Union (IoU) for Non-Maximum Suppression
function calculateIoU(boxA: [number, number, number, number], boxB: [number, number, number, number]): number {
  const [ax, ay, aw, ah] = boxA;
  const [bx, by, bw, bh] = boxB;

  const xA = Math.max(ax, bx);
  const yA = Math.max(ay, by);
  const xB = Math.min(ax + aw, bx + bw);
  const yB = Math.min(ay + ah, by + bh);

  const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
  if (interArea === 0) return 0;

  const boxAArea = aw * ah;
  const boxBArea = bw * bh;
  return interArea / (boxAArea + boxBArea - interArea);
}

// Non-Maximum Suppression (NMS) to eliminate duplicate overlapping bounding boxes
export function applyNMS(detections: LiveDetectionResult[], iouThreshold: number = 0.5): LiveDetectionResult[] {
  if (detections.length <= 1) return detections;

  const sorted = [...detections].sort((a, b) => b.score - a.score);
  const selected: LiveDetectionResult[] = [];

  for (const candidate of sorted) {
    let shouldKeep = true;
    for (const chosen of selected) {
      if (candidate.class === chosen.class) {
        const iou = calculateIoU(candidate.bbox, chosen.bbox);
        if (iou > iouThreshold) {
          shouldKeep = false;
          break;
        }
      }
    }
    if (shouldKeep) {
      selected.push(candidate);
    }
  }

  return selected;
}

// Exact token boundary matching with semantic synonyms
const SYNONYM_MAP: Record<string, string[]> = {
  phone: ['cell phone', 'smartphone', 'mobile', 'telephone'],
  cellphone: ['cell phone', 'smartphone', 'mobile'],
  smartphone: ['cell phone', 'phone', 'mobile'],
  screen: ['tv', 'laptop', 'monitor'],
  computer: ['laptop', 'monitor', 'tv'],
  vehicle: ['car', 'truck', 'bus', 'motorcycle', 'bicycle'],
  car: ['car', 'automobile'],
  truck: ['truck', 'lorry'],
  people: ['person'],
  man: ['person'],
  woman: ['person'],
  elephant: ['elephant'],
  plant: ['potted plant', 'plant'],
  leaf: ['potted plant', 'plant'],
};

export function matchesTargetClasses(detectedClass: string, targetClasses: string[]): boolean {
  if (targetClasses.length === 0) return true;

  const detected = detectedClass.toLowerCase().trim();

  return targetClasses.some((target) => {
    const query = target.toLowerCase().trim();
    if (!query) return false;

    // Direct match
    if (detected === query) return true;

    // Check synonym graph
    const synonyms = SYNONYM_MAP[query];
    if (synonyms && synonyms.includes(detected)) return true;

    // Word boundary match (prevents "car" matching "carpet")
    const regex = new RegExp(`\\b${query}\\b`, 'i');
    return regex.test(detected);
  });
}

// EMA Temporal Smoother for camera feeds
export function smoothBoundingBoxes(
  prevBoxes: LiveDetectionResult[],
  nextBoxes: LiveDetectionResult[],
  alpha: number = 0.65
): LiveDetectionResult[] {
  return nextBoxes.map((next) => {
    const match = prevBoxes.find(
      (p) => p.class === next.class && calculateIoU(p.bbox, next.bbox) > 0.4
    );
    if (!match) return next;

    return {
      class: next.class,
      score: match.score * (1 - alpha) + next.score * alpha,
      bbox: [
        match.bbox[0] * (1 - alpha) + next.bbox[0] * alpha,
        match.bbox[1] * (1 - alpha) + next.bbox[1] * alpha,
        match.bbox[2] * (1 - alpha) + next.bbox[2] * alpha,
        match.bbox[3] * (1 - alpha) + next.bbox[3] * alpha,
      ],
    };
  });
}

export async function detectVideoFrame(
  video: HTMLVideoElement,
  confThreshold: number,
  targetClasses: string[]
): Promise<LiveDetectionResult[]> {
  try {
    const model = await loadCocoModel();
    if (!video || video.readyState < 2) return [];

    const rawPredictions = await model.detect(video, 15, Math.max(0.15, confThreshold * 0.8));

    // 1. Filter by semantic query class
    const semanticFiltered = rawPredictions.filter((pred) =>
      matchesTargetClasses(pred.class, targetClasses)
    );

    // 2. Filter by threshold
    const confFiltered = semanticFiltered.filter((pred) => pred.score >= confThreshold);

    // 3. Apply IoU Non-Maximum Suppression to remove redundant boxes
    const nmsFiltered = applyNMS(confFiltered, 0.48);

    return nmsFiltered;
  } catch (err) {
    console.warn('Real-time frame detection error:', err);
    return [];
  }
}
