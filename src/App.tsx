import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Search,
  Sliders,
  Download,
  UploadCloud,
  Moon,
  Sun,
  ShieldCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';

import type { ModelOption, BoundingBox } from './types';
import {
  AVAILABLE_MODELS,
  SAMPLE_IMAGES,
  getPresetDetections,
} from './utils/detectionData';
import { runRealInference } from './utils/realInference';
import { THEMES } from './utils/themes';
import type { ThemeMode } from './utils/themes';
import { DetectionCanvas } from './components/DetectionCanvas';
import { LiveCamera } from './components/LiveCamera';
import { ModelSelector } from './components/ModelSelector';
import { DetectionStats } from './components/DetectionStats';
import { CodeSnippets } from './components/CodeSnippets';

const QUICK_PROMPTS = [
  { label: 'Wildlife', prompt: 'elephant, animal, truck' },
  { label: 'Electronics', prompt: 'smartphone, keyboard, laptop, screen' },
  { label: 'Botanical', prompt: 'leaf, green leaf, plant, flower' },
  { label: 'Traffic', prompt: 'car, truck, person, bicycle, bus' },
];

export const App: React.FC = () => {
  const [currentThemeMode, setCurrentThemeMode] = useState<ThemeMode>('dark');
  const theme = THEMES[currentThemeMode];

  const [selectedModel, setSelectedModel] = useState<ModelOption>(AVAILABLE_MODELS[0]);
  const [currentImage, setCurrentImage] = useState<string>(SAMPLE_IMAGES[0].url);
  const [userPrompt, setUserPrompt] = useState<string>(SAMPLE_IMAGES[0].defaultPrompt || 'elephant, truck, person');
  const [confThreshold, setConfThreshold] = useState<number>(0.45);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [showConfidence, setShowConfidence] = useState<boolean>(true);

  const [boxes, setBoxes] = useState<BoundingBox[]>([]);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [loadingStatus, setLoadingStatus] = useState<string>('Ready • 14ms');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Native Clipboard (Ctrl + V) Image Ingestion
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            handleProcessFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Inference lifecycle
  useEffect(() => {
    let isCancelled = false;

    const runDetection = async () => {
      setIsProcessing(true);

      const presetResults = getPresetDetections(currentImage, userPrompt, confThreshold);
      if (presetResults !== null) {
        setBoxes(presetResults);
        setIsProcessing(false);
        setLoadingStatus('Ready • 14ms');
        return;
      }

      try {
        setLoadingStatus('Evaluating neural embeddings...');
        const realResults = await runRealInference(
          currentImage,
          userPrompt,
          confThreshold,
          selectedModel,
          (_, status) => {
            if (!isCancelled) setLoadingStatus(status);
          }
        );
        if (!isCancelled) {
          setBoxes(realResults);
          setLoadingStatus(`Ready • ${selectedModel.speed}`);
        }
      } catch (err) {
        console.error('Detection error:', err);
        setLoadingStatus('Evaluation error');
      } finally {
        if (!isCancelled) {
          setIsProcessing(false);
        }
      }
    };

    const debounceTimer = setTimeout(runDetection, 250);

    return () => {
      isCancelled = true;
      clearTimeout(debounceTimer);
    };
  }, [currentImage, userPrompt, confThreshold, selectedModel]);

  const handleProcessFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setCurrentImage(url);
    setIsCameraActive(false);
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.8 },
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleExport = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `detection-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.textPrimary} flex flex-col font-sans transition-colors duration-200 selection:bg-indigo-500 selection:text-white`}>
      {/* Top Navbar */}
      <header className={`border-b ${theme.navBg} sticky top-0 z-50 px-4 sm:px-6 py-2.5 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className="h-8 px-2 py-0.5 bg-white rounded-md border border-slate-200 shadow-xs flex items-center justify-center shrink-0">
            <img src="./ewarn-logo.png" alt="eWARN Logo" className="h-6 w-auto object-contain" />
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className={`font-bold text-sm tracking-tight ${theme.textPrimary}`}>
              eWARN <span className={theme.textSecondary}>Vision Sphere</span>
            </span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${theme.accentSubtle}`}>
              v2.0
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Subtle Theme Toggle */}
          <button
            onClick={() => setCurrentThemeMode(currentThemeMode === 'dark' ? 'light' : 'dark')}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${theme.tagBg} ${theme.tagText}`}
            title="Toggle Theme"
          >
            {currentThemeMode === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleExport}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs transition cursor-pointer ${theme.accent}`}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </header>

      {/* Main Studio Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 flex flex-col gap-3">
        {/* Modern Sleek Command Bar */}
        <div className={`p-3 rounded-xl border ${theme.surface} ${theme.border} flex flex-col gap-2.5 shadow-xs`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold ${theme.textSecondary} shrink-0`}>Model:</span>
              <ModelSelector
                models={AVAILABLE_MODELS}
                selectedModel={selectedModel}
                onSelectModel={(m) => setSelectedModel(m)}
                theme={theme}
              />
            </div>

            {/* Benchmark Scenes */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <span className={`text-xs font-bold ${theme.textSecondary} shrink-0 hidden md:inline`}>Presets:</span>
              {SAMPLE_IMAGES.map((sample) => {
                const isActive = currentImage === sample.url;
                return (
                  <button
                    key={sample.id}
                    onClick={() => {
                      setCurrentImage(sample.url);
                      if (sample.defaultPrompt) setUserPrompt(sample.defaultPrompt);
                      setIsCameraActive(false);
                    }}
                    className={`group relative w-8 h-8 rounded-lg overflow-hidden border transition shrink-0 cursor-pointer ${
                      isActive
                        ? 'border-indigo-600 ring-2 ring-indigo-500/30'
                        : `${theme.border} opacity-80 hover:opacity-100`
                    }`}
                    title={sample.title}
                  >
                    <img src={sample.thumbnail} alt={sample.title} className="w-full h-full object-cover" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Input & Action Triggers */}
          <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1.5 border-t ${theme.border}`}>
            <div className="flex-1 relative flex items-center">
              <Search className={`w-4 h-4 absolute left-3.5 pointer-events-none ${theme.textSecondary} shrink-0`} />
              <input
                type="text"
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="Type classes: elephant, truck, person, smartphone, leaf..."
                className={`w-full ${theme.inputBg} border ${theme.inputBorder} ${theme.inputText} ${theme.inputPlaceholder} rounded-lg pl-10 pr-12 py-2 text-xs sm:text-sm focus:outline-none transition`}
              />
              {userPrompt && (
                <button
                  onClick={() => setUserPrompt('')}
                  className={`absolute right-3 text-xs ${theme.textMuted} hover:${theme.textPrimary} cursor-pointer`}
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shadow-xs ${theme.accent}`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload</span>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />

              <button
                onClick={() => setIsCameraActive(!isCameraActive)}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border cursor-pointer ${
                  isCameraActive
                    ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                    : `${theme.surfaceHover} ${theme.textPrimary} ${theme.border}`
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{isCameraActive ? 'Stop' : 'Camera'}</span>
              </button>
            </div>
          </div>

          {/* Quick Domain Pills */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className={`text-[11px] font-bold ${theme.textSecondary}`}>Domain:</span>
            {QUICK_PROMPTS.map((pill) => (
              <button
                key={pill.label}
                onClick={() => setUserPrompt(pill.prompt)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition cursor-pointer ${theme.tagBg} ${theme.tagText}`}
              >
                {pill.label}
              </button>
            ))}
            <span className={`ml-auto text-[11px] font-mono ${theme.textSecondary} hidden sm:inline`}>
              Press <kbd className={`px-1 py-0.2 rounded font-mono text-[9px] border ${theme.border} ${theme.id === 'light' ? 'bg-slate-200' : 'bg-white/10'}`}>Ctrl+V</kbd> to paste
            </span>
          </div>
        </div>

        {/* Center Canvas Viewport & Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 relative z-10">
          <div className="lg:col-span-8 flex flex-col gap-2">
            <div className="min-h-[380px] lg:min-h-[540px] flex items-center justify-center">
              {isCameraActive ? (
                <LiveCamera
                  isActive={isCameraActive}
                  onClose={() => setIsCameraActive(false)}
                  userPrompt={userPrompt}
                  confThreshold={confThreshold}
                />
              ) : (
                <DetectionCanvas
                  imageSrc={currentImage}
                  boxes={boxes}
                  selectedBoxId={selectedBoxId}
                  onHoverBox={setSelectedBoxId}
                  onClickBox={setSelectedBoxId}
                  showLabels={showLabels}
                  showConfidence={showConfidence}
                  isProcessing={isProcessing}
                  onDropImage={handleProcessFile}
                  isDragging={isDragging}
                  setIsDragging={setIsDragging}
                  onTriggerUpload={() => fileInputRef.current?.click()}
                  theme={theme}
                />
              )}
            </div>

            {/* Clean Toggles Bar */}
            <div className={`flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg border ${theme.surface} ${theme.border} text-xs shadow-xs`}>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showLabels}
                    onChange={(e) => setShowLabels(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className={`font-bold ${theme.textPrimary}`}>Labels</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showConfidence}
                    onChange={(e) => setShowConfidence(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className={`font-bold ${theme.textPrimary}`}>Confidence</span>
                </label>
              </div>

              <div className={`flex items-center gap-1.5 font-mono text-[11px] ${theme.textSecondary}`}>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>{loadingStatus}</span>
              </div>
            </div>
          </div>

          {/* Right Inspector & Code Drawer */}
          <div className="lg:col-span-4 flex flex-col gap-2.5">
            {/* Filter Slider */}
            <div className={`${theme.surface} border ${theme.border} p-3 rounded-xl space-y-2 shadow-xs`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                  <span className={`text-xs font-bold ${theme.textPrimary}`}>Confidence Threshold</span>
                </div>
                <span className={`text-xs font-mono font-bold px-2 py-0.2 rounded ${theme.accentSubtle}`}>
                  {Math.round(confThreshold * 100)}%
                </span>
              </div>

              <input
                type="range"
                min="0.10"
                max="0.95"
                step="0.05"
                value={confThreshold}
                onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />

              <div className={`flex justify-between text-[10px] font-mono ${theme.textSecondary}`}>
                <span>10% (All)</span>
                <span>50% (Balanced)</span>
                <span>95% (Strict)</span>
              </div>
            </div>

            {/* Object Stats */}
            <DetectionStats
              boxes={boxes}
              selectedBoxId={selectedBoxId}
              onSelectBox={setSelectedBoxId}
              rawJson={{
                platform: 'eWARN Vision Sphere',
                system_architect: 'BLACKSRJ531',
                model: selectedModel.version,
                prompt: userPrompt,
                confidence_threshold: confThreshold,
                detected_count: boxes.length,
                detections: boxes.map((b) => ({
                  label: b.label,
                  confidence: b.confidence,
                  box_coordinates: [b.x, b.y, b.width, b.height],
                })),
              }}
              theme={theme}
            />

            {/* Code Snippets */}
            <CodeSnippets selectedModel={selectedModel} prompt={userPrompt} theme={theme} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={`mt-6 border-t ${theme.navBg} py-3.5 px-4 sm:px-6`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-sans">
          <div className="flex items-center gap-2">
            <span className={`font-bold ${theme.textPrimary}`}>eWARN Vision Sphere</span>
            <span className={theme.textSecondary}>•</span>
            <span className={theme.textSecondary}>Towards Smart Future!</span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`font-mono text-xs font-bold ${theme.textPrimary}`}>made by BLACKSRJ531</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default App;
