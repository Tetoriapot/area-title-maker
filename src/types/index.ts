export const PRESET_CATEGORIES = [
  'Basic',
  'Fantasy',
  'Dark',
  'Nature',
  'Japanese',
  'SciFi',
  'Retro',
  'Special',
] as const;

export type PresetCategory = (typeof PRESET_CATEGORIES)[number];

export type LayoutType = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export type LineStyle =
  | 'none'
  | 'single'
  | 'double'
  | 'bold'
  | 'thin'
  | 'dashed'
  | 'dotted'
  | 'split'
  | 'sides'
  | 'fade';

export type TextStyle = {
  fontFamily: string;
  size: number;
  color: string;
  letterSpacing: number;
  weight: number;
  italic: boolean;
  opacity: number;
};

export type ShadowSettings = {
  enabled: boolean;
  color: string;
  x: number;
  y: number;
  blur: number;
  opacity: number;
};

export type StrokeSettings = {
  enabled: boolean;
  color: string;
  width: number;
};

export type GlowSettings = {
  enabled: boolean;
  color: string;
  blur: number;
  opacity: number;
};

export type EffectsSettings = {
  shadow: ShadowSettings;
  stroke: StrokeSettings;
  glow: GlowSettings;
  blur: number;
};

export type DecorationSettings = {
  lineStyle: LineStyle;
  symbol: string;
  width: number;
  thickness: number;
  gap: number;
  sidePadding: number;
  color: string;
  opacity: number;
};

export type AreaTitlePreset = {
  id: string;
  name: string;
  category: PresetCategory;
  mainText: string;
  subText: string;
  mainTextStyle: TextStyle;
  subTextStyle: TextStyle;
  layout: LayoutType;
  decoration: DecorationSettings;
  effects: EffectsSettings;
};

export type CanvasSettings = {
  width: number;
  height: number;
  safeArea: 0 | 50 | 70;
  autoFit: boolean;
};

export type PositionSettings = {
  x: number;
  y: number;
};

export type EditorState = {
  mainText: string;
  subText: string;
  presetId: string;
  mainTextStyle: TextStyle;
  subTextStyle: TextStyle;
  layout: LayoutType;
  decoration: DecorationSettings;
  effects: EffectsSettings;
  position: PositionSettings;
  canvas: CanvasSettings;
  backgroundDarkness: number;
  backgroundBlur: number;
  autoTrim: boolean;
  trimPadding: 32 | 64 | 128;
};

export type BackgroundAsset = {
  image: HTMLImageElement;
  url: string;
  name: string;
};

export type RenderOptions = {
  backgroundImage?: CanvasImageSource | null;
  includeBackground?: boolean;
  drawGuide?: boolean;
  bitmapScale?: number;
};
