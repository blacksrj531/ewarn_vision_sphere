import React, { useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';
import type { ModelOption } from '../types';
import type { ThemeConfig } from '../utils/themes';

interface CodeSnippetsProps {
  selectedModel: ModelOption;
  prompt: string;
  theme: ThemeConfig;
}

export const CodeSnippets: React.FC<CodeSnippetsProps> = ({
  selectedModel,
  prompt,
  theme,
}) => {
  const [activeTab, setActiveTab] = useState<'python' | 'curl' | 'js'>('python');
  const [copied, setCopied] = useState(false);

  const cleanPrompt = prompt || 'elephant, truck, person';

  const snippets = {
    python: `from ultralytics import YOLOWorld

model = YOLOWorld("${selectedModel.version}.pt")
model.set_classes([${cleanPrompt.split(',').map((c) => `"${c.trim()}"`).join(', ')}])

results = model.predict(source="image.jpg", conf=0.25, iou=0.45)
for result in results:
    for box in result.boxes:
        print(f"{model.names[int(box.cls[0])]}: {float(box.conf[0]):.1%}")`,

    curl: `curl -X POST "https://api.ewarn.ai/v2/detect" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "${selectedModel.version}", "classes": [${cleanPrompt.split(',').map((c) => `"${c.trim()}"`).join(', ')}]}'`,

    js: `import * as ort from "onnxruntime-web";
const session = await ort.InferenceSession.create("/models/${selectedModel.version}.onnx");
const output = await session.run({ images: preprocessedTensor });`
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(snippets[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`rounded-xl border overflow-hidden ${theme.surface} ${theme.border}`}>
      <div className={`flex items-center justify-between px-3 py-2 border-b ${theme.border} ${theme.id === 'light' ? 'bg-slate-50' : 'bg-white/[0.02]'}`}>
        <div className="flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-indigo-500" />
          <span className={`font-bold text-xs ${theme.textPrimary}`}>Integration Code</span>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-black/20 p-0.5 rounded-md border border-white/[0.06]">
            {(['python', 'curl', 'js'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                  activeTab === tab
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : `${theme.textSecondary} hover:${theme.textPrimary}`
                }`}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={handleCopy}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-medium transition cursor-pointer ${theme.tagBg} ${theme.tagText}`}
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      <div className="p-3 bg-[#0a0c12] font-mono text-[11px] text-slate-300 overflow-x-auto leading-relaxed max-h-44">
        <pre>{snippets[activeTab]}</pre>
      </div>
    </div>
  );
};
