import type { PositionSettings } from '@/src/types';

export type DragStart = {
  clientX: number;
  clientY: number;
  position: PositionSettings;
};

export function positionFromPointer(
  start: DragStart,
  clientX: number,
  clientY: number,
  bounds: DOMRect,
): PositionSettings {
  const x = start.position.x + ((clientX - start.clientX) / bounds.width) * 100;
  const y = start.position.y + ((clientY - start.clientY) / bounds.height) * 100;
  return {
    x: Math.max(-50, Math.min(50, Math.round(x * 10) / 10)),
    y: Math.max(-50, Math.min(50, Math.round(y * 10) / 10)),
  };
}
