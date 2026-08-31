import { cloneDefaultState } from '@/src/state/defaults';
import type { EditorState } from '@/src/types';

const STORAGE_KEY = 'area-title-maker:editor:v1';

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

export function loadEditorState(): EditorState {
  const fallback = cloneDefaultState();
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<EditorState>;
    const merged: EditorState = {
      ...fallback,
      ...parsed,
      mainTextStyle: { ...fallback.mainTextStyle, ...parsed.mainTextStyle },
      subTextStyle: { ...fallback.subTextStyle, ...parsed.subTextStyle },
      decoration: { ...fallback.decoration, ...parsed.decoration },
      effects: {
        ...fallback.effects,
        ...parsed.effects,
        shadow: { ...fallback.effects.shadow, ...parsed.effects?.shadow },
        stroke: { ...fallback.effects.stroke, ...parsed.effects?.stroke },
        glow: { ...fallback.effects.glow, ...parsed.effects?.glow },
      },
      position: { ...fallback.position, ...parsed.position },
      canvas: { ...fallback.canvas, ...parsed.canvas },
    };

    merged.canvas.width = clampNumber(merged.canvas.width, 1920, 320, 4096);
    merged.canvas.height = clampNumber(merged.canvas.height, 1080, 180, 4096);
    if (merged.canvas.width * merged.canvas.height > 16_777_216) {
      merged.canvas.width = 1920;
      merged.canvas.height = 1080;
    }
    merged.position.x = clampNumber(merged.position.x, 0, -50, 50);
    merged.position.y = clampNumber(merged.position.y, 0, -50, 50);
    return merged;
  } catch {
    return fallback;
  }
}

export function saveEditorState(state: EditorState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // The editor remains fully usable when storage is unavailable.
  }
}

export function clearEditorState() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore blocked storage; the in-memory reset still succeeds.
  }
}
