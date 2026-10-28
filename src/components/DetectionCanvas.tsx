import React, { useRef, useEffect, useState } from 'react';
import type { BoundingBox } from '../types';
import { getColorForLabel } from '../utils/colors';
import { UploadCloud, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import type { ThemeConfig } from '../utils/themes';

interface DetectionCanvasProps {
  imageSrc: string | null;
  boxes: BoundingBox[];
  selectedBoxId: string | null;
  onHoverBox: (id: string | null) => void;
  onClickBox: (id: string) => void;
  showLabels: boolean;
  showConfidence: boolean;
  isProcessing: boolean;
  onDropImage: (file: File) => void;
  isDragging: boolean;
  setIsDragging: (val: boolean) => void;
  onTriggerUpload: () => void;
  theme: ThemeConfig;
}

export const DetectionCanvas: React.FC<DetectionCanvasProps> = ({
  imageSrc,
  boxes,
  selectedBoxId,
  onHoverBox,
  onClickBox,
  showLabels,
  showConfidence,
  isProcessing,
  onDropImage,
  isDragging,
  setIsDragging,
  onTriggerUpload,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  }, [imageSrc]);

  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    imgRef.current = img;
    img.onload = () => drawCanvas();
  }, [imageSrc]);

  useEffect(() => {
    drawCanvas();
  }, [boxes, selectedBoxId, showLabels, showConfidence]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !img.complete || img.naturalWidth === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = img.naturalWidth || 1280;
    canvas.height = img.naturalHeight || 720;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    boxes.forEach((box) => {
      const isSelected = box.id === selectedBoxId;
      const palette = getColorForLabel(box.label);

      const x = box.x * canvas.width;
      const y = box.y * canvas.height;
      const w = box.width * canvas.width;
      const h = box.height * canvas.height;

      // Soft aesthetic highlight
      ctx.fillStyle = isSelected ? palette.bg.replace('0.12', '0.24') : palette.bg;
      ctx.fillRect(x, y, w, h);

      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeStyle = palette.border;
      ctx.strokeRect(x, y, w, h);

      if (showLabels) {
        const confPercent = Math.round(box.confidence * 100);
        const text = showConfidence ? `${box.label} ${confPercent}%` : box.label;

        const fontSize = Math.max(14, Math.floor(canvas.width * 0.016));
        ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

        const textMetrics = ctx.measureText(text);
        const paddingH = fontSize * 0.5;
        const badgeHeight = fontSize * 1.4;
        const badgeWidth = textMetrics.width + paddingH * 2;

        let badgeY = y - badgeHeight;
        if (badgeY < 0) badgeY = y;

        // Elegant rounded pill on canvas
        ctx.fillStyle = palette.border;
        ctx.fillRect(x, badgeY, badgeWidth, badgeHeight);

        ctx.fillStyle = '#0f172a';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x + paddingH, badgeY + badgeHeight / 2);
      }
    });
  };

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.25, 3.5));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 0.25, 0.75));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const hoverX = (e.clientX - rect.left) / rect.width;
    const hoverY = (e.clientY - rect.top) / rect.height;

    const hovered = [...boxes].reverse().find((b) => {
      return (
        hoverX >= b.x &&
        hoverX <= b.x + b.width &&
        hoverY >= b.y &&
        hoverY <= b.y + b.height
      );
    });

    onHoverBox(hovered ? hovered.id : null);
  };

  const handleMouseUp = () => setIsPanning(false);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const clickY = (e.clientY - rect.top) / rect.height;

    const clicked = [...boxes].reverse().find((b) => {
      return (
        clickX >= b.x &&
        clickX <= b.x + b.width &&
        clickY >= b.y &&
        clickY <= b.y + b.height
      );
    });

    if (clicked) onClickBox(clicked.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onDropImage(file);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative w-full h-full min-h-[380px] lg:min-h-[540px] flex flex-col items-center justify-center overflow-hidden bg-[#0a0c12] rounded-xl border border-white/[0.06] shadow-xl"
    >
      {/* Zoom / Pan Minimalist HUD */}
      {imageSrc && (
        <div className="absolute top-3 right-3 z-30 flex items-center gap-1 p-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-xs">
          <button
            onClick={handleZoomIn}
            className="p-1 rounded text-slate-400 hover:text-white transition cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono px-1 text-slate-300 font-medium">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={handleZoomOut}
            className="p-1 rounded text-slate-400 hover:text-white transition cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-1 rounded text-slate-400 hover:text-white transition cursor-pointer"
            title="Reset"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-40 bg-indigo-950/80 backdrop-blur-md flex flex-col items-center justify-center gap-3 border-2 border-dashed border-indigo-400/60 rounded-xl p-4 text-center">
          <UploadCloud className="w-10 h-10 text-indigo-400 animate-bounce" />
          <p className="text-white font-medium text-sm">Drop image to inspect</p>
        </div>
      )}

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center gap-2.5">
          <div className="w-6 h-6 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
          <p className="text-slate-200 font-medium text-xs">Evaluating neural embeddings...</p>
        </div>
      )}

      {/* Canvas Viewport */}
      {imageSrc ? (
        <div
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          className={`relative w-full h-full flex items-center justify-center p-2 overflow-hidden ${
            zoomLevel > 1 ? 'cursor-grab active:cursor-grabbing' : ''
          }`}
        >
          <div
            style={{
              transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
              transition: isPanning ? 'none' : 'transform 0.12s ease-out',
            }}
          >
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => onHoverBox(null)}
              className="max-h-[540px] max-w-full w-auto h-auto object-contain cursor-crosshair rounded-lg"
            />
          </div>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
            <button
              onClick={onTriggerUpload}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/65 hover:bg-black/90 border border-white/10 text-xs text-slate-300 hover:text-white transition cursor-pointer backdrop-blur-md"
            >
              <UploadCloud className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[11px] font-medium">Replace image</span>
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={onTriggerUpload}
          className="w-full h-full py-16 px-6 flex flex-col items-center justify-center text-center cursor-pointer select-none"
        >
          <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-400 mb-3">
            <UploadCloud className="w-6 h-6" />
          </div>
          <h3 className="text-xs font-semibold text-slate-200 mb-1">Click or drag image to evaluate</h3>
          <p className="text-[11px] text-slate-500 max-w-xs">
            Supports PNG, JPG, WebP. Press <kbd className="px-1 py-0.2 rounded bg-white/[0.08] text-slate-300 font-mono text-[10px]">Ctrl+V</kbd> to paste.
          </p>
        </div>
      )}
    </div>
  );
};
