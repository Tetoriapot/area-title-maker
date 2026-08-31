import type { EditorState } from '@/src/types';

export const DEFAULT_STATE: EditorState = {
  mainText: '忘れられた王都',
  subText: 'Forgotten Capital',
  presetId: 'golden-kingdom',
  mainTextStyle: {
    fontFamily: '"Yu Mincho", "Hiragino Mincho ProN", serif',
    size: 94,
    color: '#e2c071',
    letterSpacing: 10,
    weight: 600,
    italic: false,
    opacity: 1,
  },
  subTextStyle: {
    fontFamily: 'Georgia, "Times New Roman", serif',
    size: 32,
    color: '#f0e1b5',
    letterSpacing: 6,
    weight: 400,
    italic: false,
    opacity: 0.9,
  },
  layout: 'C',
  decoration: {
    lineStyle: 'split',
    symbol: '◇',
    width: 720,
    thickness: 2.5,
    gap: 46,
    sidePadding: 0,
    color: '#cfa74e',
    opacity: 0.95,
  },
  effects: {
    shadow: {
      enabled: true,
      color: '#000000',
      x: 0,
      y: 4,
      blur: 10,
      opacity: 0.45,
    },
    stroke: { enabled: true, color: '#5c451a', width: 1 },
    glow: {
      enabled: true,
      color: '#e7bd64',
      blur: 14,
      opacity: 0.28,
    },
    blur: 0,
  },
  position: { x: 0, y: 0 },
  canvas: { width: 1920, height: 1080, safeArea: 70, autoFit: true },
  backgroundDarkness: 20,
  backgroundBlur: 0,
  autoTrim: true,
  trimPadding: 64,
};

export function cloneDefaultState(): EditorState {
  return JSON.parse(JSON.stringify(DEFAULT_STATE)) as EditorState;
}
