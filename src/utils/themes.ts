export type ThemeMode = 'dark' | 'light';

export interface ThemeConfig {
  id: ThemeMode;
  name: string;
  bg: string;
  surface: string;
  surfaceHover: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentHover: string;
  accentText: string;
  accentSubtle: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
  inputPlaceholder: string;
  canvasBg: string;
  navBg: string;
  tagBg: string;
  tagText: string;
}

export const THEMES: Record<ThemeMode, ThemeConfig> = {
  dark: {
    id: 'dark',
    name: 'Mission Dark',
    bg: 'bg-[#090b10]',
    surface: 'bg-[#11141c]',
    surfaceHover: 'hover:bg-[#161a24]',
    border: 'border-white/[0.08]',
    borderStrong: 'border-white/[0.16]',
    textPrimary: 'text-slate-100',
    textSecondary: 'text-slate-400',
    textMuted: 'text-slate-500',
    accent: 'bg-indigo-600 hover:bg-indigo-500 text-white',
    accentHover: 'hover:bg-indigo-500',
    accentText: 'text-indigo-400',
    accentSubtle: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
    inputBg: 'bg-[#0c0e15]',
    inputBorder: 'border-white/[0.1] focus:border-indigo-400',
    inputText: 'text-slate-100',
    inputPlaceholder: 'placeholder:text-slate-500',
    canvasBg: 'bg-[#06070a]',
    navBg: 'bg-[#090b10]/90 backdrop-blur-xl border-white/[0.08]',
    tagBg: 'bg-white/[0.05] hover:bg-white/[0.09] border-white/[0.08]',
    tagText: 'text-slate-300',
  },
  light: {
    id: 'light',
    name: 'Executive Light',
    bg: 'bg-[#f8fafc]',
    surface: 'bg-white',
    surfaceHover: 'hover:bg-slate-50',
    border: 'border-slate-200',
    borderStrong: 'border-slate-300',
    textPrimary: 'text-slate-900', // Crystal clear contrast, no washed-out grays!
    textSecondary: 'text-slate-600',
    textMuted: 'text-slate-400',
    accent: 'bg-slate-900 hover:bg-slate-800 text-white',
    accentHover: 'hover:bg-slate-800',
    accentText: 'text-indigo-600',
    accentSubtle: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    inputBg: 'bg-white',
    inputBorder: 'border-slate-300 focus:border-indigo-600',
    inputText: 'text-slate-900 font-medium',
    inputPlaceholder: 'placeholder:text-slate-400',
    canvasBg: 'bg-[#0f121a]',
    navBg: 'bg-white/90 backdrop-blur-xl border-slate-200 shadow-xs',
    tagBg: 'bg-slate-100 hover:bg-slate-200 border-slate-200',
    tagText: 'text-slate-800 font-medium',
  },
};
