import React, { useRef, useEffect, useState } from 'react';
import { CameraOff, RefreshCw, AlertCircle, Video, Square, Download, Cpu } from 'lucide-react';
import { getColorForLabel } from '../utils/colors';
import { detectVideoFrame, smoothBoundingBoxes, type LiveDetectionResult } from '../utils/liveInference';

interface LiveCameraProps {
  isActive: boolean;
  onClose: () => void;
  userPrompt: string;
  confThreshold: number;
}

export const LiveCamera: React.FC<LiveCameraProps> = ({
  isActive,
  onClose,
  userPrompt,
  confThreshold,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fps, setFps] = useState<number>(30);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const recordingTimerRef = useRef<any>(null);
  const isInferringRef = useRef<boolean>(false);
  const cachedDetectionsRef = useRef<LiveDetectionResult[]>([]);
  const [modelReady, setModelReady] = useState<boolean>(false);

  useEffect(() => {
    if (isActive) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isActive, facingMode]);

  useEffect(() => {
    return () => {
      if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);
    };
  }, [recordedVideoUrl]);

  const startCamera = async () => {
    setErrorMsg(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      // Check if getUserMedia is supported in the current context
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('SECURE_CONTEXT_REQUIRED');
      }

      let stream: MediaStream | null = null;
      try {
        // Request 60 FPS hardware capture with fallback
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 60, min: 30 },
          },
          audio: false,
        });
      } catch (errFallback) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: facingMode },
              frameRate: { ideal: 60 },
            },
            audio: false,
          });
        } catch (errFinal) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.muted = true;
        try {
          const playPromise = video.play();
          if (playPromise !== undefined) {
            await playPromise;
          }
        } catch (playErr: any) {
          // If play was aborted or interrupted by remount/unmount, ignore or silently handle
          if (playErr.name !== 'AbortError') {
            console.warn('Video play caught:', playErr);
          }
        }
        startInferenceLoop();
      }
    } catch (err: any) {
      console.error('Camera stream error:', err);
      // Don't show scary hardware error on benign play() interruption
      if (err.name === 'AbortError' || (err.message && err.message.includes('play() request was interrupted'))) {
        return;
      }
      if (err.message === 'SECURE_CONTEXT_REQUIRED') {
        setErrorMsg('Camera access requires HTTPS or localhost. If testing on mobile, connect via HTTPS or tunnel.');
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMsg('Camera permission was denied. Tap browser settings and grant camera access.');
      } else {
        setErrorMsg(err.message || 'Unable to open camera hardware.');
      }
    }
  };

  const stopCamera = () => {
    if (isRecording) stopRecording();
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const startRecording = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      recordedChunksRef.current = [];
      const canvasStream = canvas.captureStream(30);

      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4',
      ];
      const selectedMime = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || '';

      const recorder = new MediaRecorder(canvasStream, selectedMime ? { mimeType: selectedMime } : undefined);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: selectedMime || 'video/webm',
        });
        const url = URL.createObjectURL(blob);
        setRecordedVideoUrl(url);
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      console.error('Recording error:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
  };

  const startInferenceLoop = () => {
    let lastTime = performance.now();
    let frameCount = 0;
    let lastInferenceTime = 0;

    const render = async (currentTime: number) => {
      frameCount++;
      if (currentTime - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = currentTime;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState >= 2) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;

          // 1. Draw raw video frame
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // 2. Trigger asynchronous real neural detection every ~120ms without stalling canvas FPS
          const activeClasses = userPrompt
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);

          if (!isInferringRef.current && currentTime - lastInferenceTime > 120) {
            isInferringRef.current = true;
            lastInferenceTime = currentTime;

            detectVideoFrame(video, confThreshold, activeClasses)
              .then((results) => {
                cachedDetectionsRef.current = smoothBoundingBoxes(cachedDetectionsRef.current, results, 0.65);
                if (!modelReady) setModelReady(true);
              })
              .catch((e) => console.warn('Inference error:', e))
              .finally(() => {
                isInferringRef.current = false;
              });
          }

          // 3. Render real detected bounding boxes accurately on target objects
          const realDetections = cachedDetectionsRef.current;
          realDetections.forEach((det) => {
            const [bx, by, bw, bh] = det.bbox;
            const cls = det.class;
            const conf = det.score;
            const palette = getColorForLabel(cls);

            ctx.lineWidth = 2.5;
            ctx.strokeStyle = palette.border;
            ctx.strokeRect(bx, by, bw, bh);
            ctx.fillStyle = palette.bg;
            ctx.fillRect(bx, by, bw, bh);

            // Label pill
            const text = `${cls.charAt(0).toUpperCase() + cls.slice(1)} ${Math.round(conf * 100)}%`;
            const fontSize = Math.max(13, Math.floor(canvas.width * 0.024));
            ctx.font = `600 ${fontSize}px sans-serif`;
            const tw = ctx.measureText(text).width + 12;
            const th = fontSize * 1.4;

            ctx.fillStyle = palette.border;
            ctx.fillRect(bx, Math.max(0, by - th), tw, th);
            ctx.fillStyle = '#0f172a';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, bx + 6, Math.max(th / 2, by - th / 2));
          });
        }
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);
  };

  if (!isActive) return null;

  return (
    <div className="relative w-full h-full min-h-[400px] lg:min-h-[540px] flex flex-col items-center justify-center bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10">
      {/* Top Telemetry & Controls */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-3 py-1 rounded-full text-emerald-400 text-xs font-mono font-bold border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{facingMode === 'environment' ? 'BACK' : 'FRONT'} • {fps} FPS</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-full text-indigo-300 text-xs font-mono border border-indigo-500/20">
            <Cpu className="w-3 h-3 text-indigo-400" />
            <span>{modelReady ? 'MobileNet Neural Active' : 'Loading Engine...'}</span>
          </div>

          {isRecording && (
            <div className="flex items-center gap-1.5 bg-red-600 text-white px-2.5 py-1 rounded-full text-xs font-mono font-bold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-white" />
              <span>REC {recordingSeconds}s</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 pointer-events-auto">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <Video className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Record</span>
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="px-2.5 py-1.5 rounded-lg bg-white text-red-600 text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <Square className="w-3.5 h-3.5 fill-red-600" />
              <span>Stop</span>
            </button>
          )}

          <button
            onClick={toggleFacingMode}
            className="p-1.5 rounded-lg bg-black/75 hover:bg-slate-800 text-white border border-white/10 transition cursor-pointer"
            title="Switch Lens"
          >
            <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white transition cursor-pointer"
          >
            <CameraOff className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Video element kept continuously in DOM to avoid race conditions */}
      <video ref={videoRef} className="hidden" playsInline muted autoPlay />

      {errorMsg ? (
        <div className="p-6 text-center flex flex-col items-center gap-3 max-w-sm">
          <AlertCircle className="w-10 h-10 text-rose-400" />
          <h4 className="text-white font-bold text-sm">Camera Hardware Notice</h4>
          <p className="text-slate-300 text-xs leading-relaxed">{errorMsg}</p>
          <button
            onClick={startCamera}
            className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold cursor-pointer transition shadow-xs"
          >
            Retry Connection
          </button>
        </div>
      ) : (
        <canvas ref={canvasRef} className="w-full h-full object-cover max-h-[540px]" />
      )}

      {recordedVideoUrl && !isRecording && (
        <div className="absolute top-14 left-3 right-3 z-30 flex items-center justify-between p-2.5 rounded-xl bg-slate-900/95 border border-indigo-500/40 shadow-2xl backdrop-blur-md">
          <span className="text-xs text-white font-medium">Recording ready to export</span>
          <div className="flex items-center gap-2">
            <a
              href={recordedVideoUrl}
              download={`detection-clip-${Date.now()}.webm`}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
            <button onClick={() => setRecordedVideoUrl(null)} className="text-xs text-slate-400 hover:text-white">
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="absolute bottom-3 left-3 right-3 z-20 flex justify-center pointer-events-none">
        <div className="bg-black/75 backdrop-blur-md px-3.5 py-1 rounded-full border border-white/10 text-xs text-slate-300 pointer-events-auto flex items-center gap-1.5 max-w-[90%] truncate">
          <span className="text-indigo-400 font-bold shrink-0">Detecting:</span>
          <span className="truncate font-medium">{userPrompt || 'Any object'}</span>
        </div>
      </div>
    </div>
  );
};
