import { FONT_OPTIONS } from '@/src/data/fonts';
import { SYMBOLS } from '@/src/data/symbols';
import { cloneDefaultState } from '@/src/state/defaults';
import type { EditorState, TextStyle } from '@/src/types';

const STORAGE_KEY = 'area-title-maker:editor:v1';
const MAX_STORAGE_LENGTH = 64 * 1024;
const MAX_CANVAS_PIXELS = 16_777_216;

const LAYOUTS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;
const LINE_STYLES = [
  'none',
  'single',
  'double',
  'bold',
  'thin',
  'dashed',
  'dotted',
  'split',
  'sides',
  'fade',
] as const;
const FONT_FAMILIES: readonly string[] = FONT_OPTIONS.map((font) => font.value);
const FONT_WEIGHTS = [300, 400, 500, 600, 700, 800, 900] as const;
const SAFE_AREAS = [0, 50, 70] as const;
const TRIM_PADDINGS = [32, 64, 128] as const;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clampNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function boundedString(value: unknown, fallback: string, maxLength: number) {
  return typeof value === 'string' ? value.slice(0, maxLength) : fallback;
}

function booleanValue(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function oneOf<T extends string | number>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function colorValue(value: unknown, fallback: string) {
  return typeof value === 'string' && HEX_COLOR.test(value)
    ? value.toLowerCase()
    : fallback;
}

function normalizeTextStyle(value: unknown, fallback: TextStyle): TextStyle {
  const source = isRecord(value) ? value : {};
  return {
    fontFamily: oneOf(source.fontFamily, FONT_FAMILIES, fallback.fontFamily),
    size: clampNumber(source.size, fallback.size, 12, 180),
    color: colorValue(source.color, fallback.color),
    letterSpacing: clampNumber(
      source.letterSpacing,
      fallback.letterSpacing,
      -2,
      40,
    ),
    weight: oneOf(source.weight, FONT_WEIGHTS, fallback.weight),
    italic: booleanValue(source.italic, fallback.italic),
    opacity: clampNumber(source.opacity, fallback.opacity, 0, 1),
  };
}

export function normalizeEditorState(value: unknown): EditorState {
  const fallback = cloneDefaultState();
  if (!isRecord(value)) return fallback;

  const decoration = isRecord(value.decoration) ? value.decoration : {};
  const effects = isRecord(value.effects) ? value.effects : {};
  const shadow = isRecord(effects.shadow) ? effects.shadow : {};
  const stroke = isRecord(effects.stroke) ? effects.stroke : {};
  const glow = isRecord(effects.glow) ? effects.glow : {};
  const position = isRecord(value.position) ? value.position : {};
  const canvas = isRecord(value.canvas) ? value.canvas : {};

  const normalized: EditorState = {
    mainText: boundedString(value.mainText, fallback.mainText, 100),
    subText: boundedString(value.subText, fallback.subText, 100),
    presetId: boundedString(value.presetId, fallback.presetId, 64),
    mainTextStyle: normalizeTextStyle(
      value.mainTextStyle,
      fallback.mainTextStyle,
    ),
    subTextStyle: normalizeTextStyle(value.subTextStyle, fallback.subTextStyle),
    layout: oneOf(value.layout, LAYOUTS, fallback.layout),
    decoration: {
      lineStyle: oneOf(
        decoration.lineStyle,
        LINE_STYLES,
        fallback.decoration.lineStyle,
      ),
      symbol: oneOf(decoration.symbol, SYMBOLS, fallback.decoration.symbol),
      width: clampNumber(
        decoration.width,
        fallback.decoration.width,
        100,
        1500,
      ),
      thickness: clampNumber(
        decoration.thickness,
        fallback.decoration.thickness,
        0.5,
        12,
      ),
      gap: clampNumber(decoration.gap, fallback.decoration.gap, 0, 140),
      sidePadding: clampNumber(
        decoration.sidePadding,
        fallback.decoration.sidePadding,
        0,
        300,
      ),
      color: colorValue(decoration.color, fallback.decoration.color),
      opacity: clampNumber(
        decoration.opacity,
        fallback.decoration.opacity,
        0,
        1,
      ),
    },
    effects: {
      shadow: {
        enabled: booleanValue(shadow.enabled, fallback.effects.shadow.enabled),
        color: colorValue(shadow.color, fallback.effects.shadow.color),
        x: clampNumber(shadow.x, fallback.effects.shadow.x, -30, 30),
        y: clampNumber(shadow.y, fallback.effects.shadow.y, -30, 30),
        blur: clampNumber(shadow.blur, fallback.effects.shadow.blur, 0, 60),
        opacity: clampNumber(
          shadow.opacity,
          fallback.effects.shadow.opacity,
          0,
          1,
        ),
      },
      stroke: {
        enabled: booleanValue(stroke.enabled, fallback.effects.stroke.enabled),
        color: colorValue(stroke.color, fallback.effects.stroke.color),
        width: clampNumber(
          stroke.width,
          fallback.effects.stroke.width,
          0.5,
          12,
        ),
      },
      glow: {
        enabled: booleanValue(glow.enabled, fallback.effects.glow.enabled),
        color: colorValue(glow.color, fallback.effects.glow.color),
        blur: clampNumber(glow.blur, fallback.effects.glow.blur, 0, 80),
        opacity: clampNumber(glow.opacity, fallback.effects.glow.opacity, 0, 1),
      },
      blur: clampNumber(effects.blur, fallback.effects.blur, 0, 8),
    },
    position: {
      x: clampNumber(position.x, fallback.position.x, -50, 50),
      y: clampNumber(position.y, fallback.position.y, -50, 50),
    },
    canvas: {
      width: clampNumber(canvas.width, fallback.canvas.width, 320, 4096),
      height: clampNumber(canvas.height, fallback.canvas.height, 180, 4096),
      safeArea: oneOf(canvas.safeArea, SAFE_AREAS, fallback.canvas.safeArea),
      autoFit: booleanValue(canvas.autoFit, fallback.canvas.autoFit),
    },
    backgroundDarkness: clampNumber(
      value.backgroundDarkness,
      fallback.backgroundDarkness,
      0,
      80,
    ),
    backgroundBlur: clampNumber(
      value.backgroundBlur,
      fallback.backgroundBlur,
      0,
      20,
    ),
    autoTrim: booleanValue(value.autoTrim, fallback.autoTrim),
    trimPadding: oneOf(value.trimPadding, TRIM_PADDINGS, fallback.trimPadding),
  };

  if (normalized.canvas.width * normalized.canvas.height > MAX_CANVAS_PIXELS) {
    normalized.canvas = { ...fallback.canvas };
  }

  return normalized;
}

function discardStoredState() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be disabled independently from reads.
  }
}

export function loadEditorState(): EditorState {
  const fallback = cloneDefaultState();
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    if (raw.length > MAX_STORAGE_LENGTH) {
      discardStoredState();
      return fallback;
    }
    return normalizeEditorState(JSON.parse(raw) as unknown);
  } catch {
    discardStoredState();
    return fallback;
  }
}

export function saveEditorState(state: EditorState) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(normalizeEditorState(state)),
    );
  } catch {
    // The editor remains fully usable when storage is unavailable.
  }
}

export function clearEditorState() {
  discardStoredState();
}
