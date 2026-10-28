import React, { useState } from 'react';
import type { ModelOption } from '../types';
import { ChevronDown, Sparkles, Cpu, Check, X } from 'lucide-react';
import type { ThemeConfig } from '../utils/themes';

interface ModelSelectorProps {
  models: ModelOption[];
  selectedModel: ModelOption;
  onSelectModel: (model: ModelOption) => void;
  theme: ThemeConfig;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  selectedModel,
  onSelectModel,
  theme,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block text-left w-full sm:w-auto">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full sm:w-auto flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border transition cursor-pointer text-xs font-semibold ${
          theme.id === 'light'
            ? 'bg-slate-100/80 hover:bg-slate-200/80 border-slate-300 text-slate-900 shadow-2xs'
            : 'bg-white/[0.05] hover:bg-white/[0.08] border-white/[0.1] text-slate-100 shadow-2xs'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span className="truncate">{selectedModel.name}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border font-medium ${
            theme.id === 'light'
              ? 'bg-white text-slate-700 border-slate-300'
              : 'bg-white/[0.06] text-slate-300 border-white/[0.1]'
          }`}>
            {selectedModel.speed}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[999] bg-black/50 backdrop-blur-xs"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Modal / Dropdown Dialog */}
      {isOpen && (
        <div className="fixed inset-x-3 bottom-4 sm:bottom-auto sm:inset-x-auto sm:absolute sm:left-0 sm:top-full sm:mt-1.5 sm:w-[380px] z-[1000] animate-in fade-in zoom-in-95 duration-100">
          <div className={`rounded-xl ${theme.surface} border ${theme.borderStrong} shadow-2xl p-2.5 flex flex-col max-h-[70vh] sm:max-h-[440px] overflow-hidden`}>
            <div className={`px-2 py-1.5 border-b ${theme.border} flex items-center justify-between text-xs font-bold ${theme.textPrimary}`}>
              <span>Neural Architecture Checkpoints</span>
              <button onClick={() => setIsOpen(false)} className={`p-1 rounded-md ${theme.surfaceHover} ${theme.textSecondary} cursor-pointer`}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-1 p-1">
              {models.map((m) => {
                const isSelected = m.id === selectedModel.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      onSelectModel(m);
                      setIsOpen(false);
                    }}
                    className={`p-2.5 rounded-lg cursor-pointer transition flex items-start justify-between gap-2 ${
                      isSelected
                        ? theme.id === 'light'
                          ? 'bg-indigo-50 border border-indigo-300 text-slate-900'
                          : 'bg-indigo-500/15 border border-indigo-500/30 text-white'
                        : `${theme.surfaceHover} border border-transparent ${theme.textPrimary}`
                    }`}
                  >
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs truncate">{m.name}</span>
                        {m.isBest && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 border border-amber-500/30">
                            BEST
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] ${theme.textSecondary} leading-snug line-clamp-2`}>{m.description}</p>
                    </div>

                    {isSelected && (
                      <div className="p-1 rounded-full bg-indigo-500/20 text-indigo-500 shrink-0 mt-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className={`px-2 py-1.5 border-t ${theme.border} text-[10px] ${theme.textSecondary} flex items-center gap-1.5 font-mono`}>
              <Cpu className="w-3 h-3 text-indigo-500" />
              <span>Client-side WebGPU acceleration active</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
