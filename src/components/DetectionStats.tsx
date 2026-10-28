import React, { useState } from 'react';
import type { BoundingBox } from '../types';
import { getColorForLabel } from '../utils/colors';
import { Layers, ListFilter, Code2 } from 'lucide-react';
import type { ThemeConfig } from '../utils/themes';

interface DetectionStatsProps {
  boxes: BoundingBox[];
  selectedBoxId: string | null;
  onSelectBox: (id: string | null) => void;
  rawJson: any;
  theme: ThemeConfig;
}

export const DetectionStats: React.FC<DetectionStatsProps> = ({
  boxes,
  selectedBoxId,
  onSelectBox,
  rawJson,
  theme,
}) => {
  const [showJson, setShowJson] = useState(false);

  const countsByClass = boxes.reduce((acc, box) => {
    acc[box.label] = (acc[box.label] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex flex-col gap-2.5">
      {/* 1. Class Counts Summary */}
      <div className={`p-3 rounded-xl border ${theme.surface} ${theme.border}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            <span className={`text-xs font-bold ${theme.textPrimary}`}>Detected Objects</span>
          </div>
          <span className={`text-[11px] font-mono font-bold px-2 py-0.2 rounded-full ${theme.accentSubtle}`}>
            {boxes.length} {boxes.length === 1 ? 'object' : 'objects'}
          </span>
        </div>

        {Object.keys(countsByClass).length === 0 ? (
          <p className={`text-xs ${theme.textMuted} italic py-1`}>No targets detected in current threshold.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(countsByClass).map(([label, count]) => {
              const palette = getColorForLabel(label);
              return (
                <div
                  key={label}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold"
                  style={{
                    backgroundColor: palette.bg,
                    borderColor: palette.border,
                    color: palette.text,
                  }}
                >
                  <span>{label}</span>
                  <span
                    className="px-1.5 py-0.2 rounded text-[10px] font-mono font-black"
                    style={{ backgroundColor: palette.border, color: '#090a0f' }}
                  >
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Detected Instances List */}
      <div className={`rounded-xl border overflow-hidden ${theme.surface} ${theme.border}`}>
        <div className={`px-3 py-2 border-b ${theme.border} flex items-center justify-between`}>
          <div className="flex items-center gap-1.5">
            <ListFilter className={`w-3.5 h-3.5 ${theme.textSecondary}`} />
            <span className={`text-xs font-bold ${theme.textPrimary}`}>Detection Instances</span>
          </div>
          <button
            onClick={() => setShowJson(!showJson)}
            className={`flex items-center gap-1 text-[11px] font-mono font-bold transition cursor-pointer ${theme.accentText}`}
          >
            <Code2 className="w-3 h-3" />
            <span>{showJson ? 'List' : 'JSON'}</span>
          </button>
        </div>

        {showJson ? (
          <div className="p-3 bg-slate-950 max-h-56 overflow-y-auto text-xs font-mono text-emerald-400 leading-relaxed">
            <pre>{JSON.stringify(rawJson, null, 2)}</pre>
          </div>
        ) : (
          <div className={`divide-y ${theme.border} max-h-56 overflow-y-auto`}>
            {boxes.length === 0 ? (
              <div className={`p-4 text-center text-xs ${theme.textMuted}`}>
                No objects match the filter criteria
              </div>
            ) : (
              boxes.map((box) => {
                const isSelected = box.id === selectedBoxId;
                const palette = getColorForLabel(box.label);
                return (
                  <div
                    key={box.id}
                    onClick={() => onSelectBox(isSelected ? null : box.id)}
                    className={`px-3 py-2 flex items-center justify-between text-xs cursor-pointer transition ${
                      isSelected
                        ? theme.id === 'light'
                          ? 'bg-indigo-50 border-l-4 border-indigo-600'
                          : 'bg-indigo-500/15 border-l-4 border-indigo-400'
                        : `${theme.surfaceHover}`
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: palette.border }}
                      />
                      <span className={`font-bold truncate ${theme.textPrimary}`}>{box.label}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`font-mono text-xs font-bold ${theme.textPrimary}`}>
                        {Math.round(box.confidence * 100)}%
                      </span>
                      <div className={`w-12 h-1.5 rounded-full overflow-hidden ${theme.id === 'light' ? 'bg-slate-200' : 'bg-white/10'}`}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${box.confidence * 100}%`,
                            backgroundColor: palette.border,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
