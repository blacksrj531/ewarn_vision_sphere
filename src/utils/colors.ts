export const PALETTE = [
  { name: 'Sky', border: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)', text: '#bae6fd' },
  { name: 'Indigo', border: '#818cf8', bg: 'rgba(129, 140, 248, 0.12)', text: '#c7d2fe' },
  { name: 'Emerald', border: '#34d399', bg: 'rgba(52, 211, 153, 0.12)', text: '#a7f3d0' },
  { name: 'Amber', border: '#fbbf24', bg: 'rgba(251, 191, 36, 0.12)', text: '#fde68a' },
  { name: 'Rose', border: '#fb7185', bg: 'rgba(251, 113, 133, 0.12)', text: '#fecdd3' },
  { name: 'Teal', border: '#2dd4bf', bg: 'rgba(45, 212, 191, 0.12)', text: '#99f6e4' },
];

export function getColorForLabel(label: string): typeof PALETTE[0] {
  const l = label.toLowerCase();
  if (l.includes('elephant')) return PALETTE[0]; // Sky blue
  if (l.includes('truck') || l.includes('vehicle')) return PALETTE[3]; // Warm amber
  if (l.includes('person') || l.includes('people')) return PALETTE[4]; // Soft rose
  if (l.includes('leaf') || l.includes('plant')) return PALETTE[2]; // Sage emerald

  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index];
}
