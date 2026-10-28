export interface BoundingBox {
  id: string;
  label: string;
  confidence: number;
  x: number;      // 0 to 1 relative
  y: number;      // 0 to 1 relative
  width: number;  // 0 to 1 relative
  height: number; // 0 to 1 relative
  color: string;
}

export interface ModelOption {
  id: string;
  name: string;
  version: string;
  tag: string;
  isBest?: boolean;
  isZeroShot?: boolean;
  size: string;
  speed: string;
  description: string;
}

export interface SampleImage {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  defaultPrompt?: string;
}

export interface DetectionResult {
  boxes: BoundingBox[];
  inferenceTimeMs: number;
  imageDimensions: { width: number; height: number };
}
