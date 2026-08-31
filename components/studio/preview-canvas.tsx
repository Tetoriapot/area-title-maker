'use client';

import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { Maximize2, Move, ScanLine } from 'lucide-react';

import { positionFromPointer, type DragStart } from '@/src/editor/drag';
import { renderTitleCard } from '@/src/editor/renderer';
import type { BackgroundAsset, EditorState, PositionSettings } from '@/src/types';

type PreviewCanvasProps = {
  state: EditorState;
  background: BackgroundAsset | null;
  onPositionChange: (position: PositionSettings) => void;
};

export function PreviewCanvas({
  state,
  background,
  onPositionChange,
}: PreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<DragStart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const deviceScale = Math.min(window.devicePixelRatio || 1, 2);
    const previewScale = Math.min(1, 1280 / state.canvas.width) * deviceScale;
    renderTitleCard(canvas, state, {
      backgroundImage: background?.image,
      includeBackground: Boolean(background),
      drawGuide: true,
      bitmapScale: previewScale,
    });
  }, [background, state]);

  const beginDrag = (event: PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      position: { ...state.position },
    };
  };

  const moveDrag = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) return;
    onPositionChange(
      positionFromPointer(
        dragRef.current,
        event.clientX,
        event.clientY,
        event.currentTarget.getBoundingClientRect(),
      ),
    );
  };

  const endDrag = (event: PointerEvent<HTMLCanvasElement>) => {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const moveWithKeyboard = (event: KeyboardEvent<HTMLCanvasElement>) => {
    const amount = event.shiftKey ? 5 : 1;
    let next = { ...state.position };
    if (event.key === 'ArrowLeft') next.x -= amount;
    else if (event.key === 'ArrowRight') next.x += amount;
    else if (event.key === 'ArrowUp') next.y -= amount;
    else if (event.key === 'ArrowDown') next.y += amount;
    else return;
    event.preventDefault();
    next = {
      x: Math.max(-50, Math.min(50, next.x)),
      y: Math.max(-50, Math.min(50, next.y)),
    };
    onPositionChange(next);
  };

  const zoom = Math.round(
    Math.min(100, (1100 / state.canvas.width) * 100),
  );

  return (
    <section className="preview-panel order-1 flex min-h-[390px] flex-col overflow-hidden rounded-xl border bg-[#171816] lg:order-2 lg:min-h-[calc(100vh-105px)]">
      <div className="flex min-h-13 items-center justify-between border-b px-4 py-2.5">
        <div>
          <div className="flex items-center gap-2">
            <ScanLine className="size-3.5 text-primary" />
            <h2 className="text-xs font-semibold tracking-wide">プレビュー</h2>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {state.canvas.width} × {state.canvas.height} · 約{zoom}%
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="hidden items-center gap-1.5 sm:flex">
            <Move className="size-3" /> ドラッグで移動
          </span>
          <span className="flex items-center gap-1.5 rounded-md border bg-background/40 px-2 py-1">
            <Maximize2 className="size-3" />
            {state.canvas.safeArea ? `SAFE ${state.canvas.safeArea}%` : 'GUIDE OFF'}
          </span>
        </div>
      </div>

      <div className="checkerboard grid flex-1 place-items-center overflow-hidden p-3 sm:p-6 lg:p-8">
        <div
          className="relative w-full max-w-[1150px] overflow-hidden border border-white/10 bg-black/10 shadow-[0_28px_80px_rgba(0,0,0,.48)]"
          style={{ aspectRatio: `${state.canvas.width} / ${state.canvas.height}` }}
        >
          <figure className="absolute inset-0 size-full">
            <canvas
              ref={canvasRef}
              aria-describedby="preview-description"
              tabIndex={0}
              onPointerDown={beginDrag}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onKeyDown={moveWithKeyboard}
              className="absolute inset-0 size-full cursor-move touch-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
            />
            <figcaption id="preview-description" className="sr-only">
              {state.mainText || '無題'}{state.subText ? `、${state.subText}` : ''} のエリアタイトルプレビュー。矢印キーで位置を変更できます。
            </figcaption>
          </figure>
        </div>
      </div>

      <div className="flex min-h-10 items-center justify-between border-t px-4 py-2 text-[10px] text-muted-foreground">
        <span>
          位置 X {state.position.x.toFixed(1)}% · Y {state.position.y.toFixed(1)}%
        </span>
        <span>{background ? `背景: ${background.name}` : '透明背景で出力'}</span>
      </div>
    </section>
  );
}
