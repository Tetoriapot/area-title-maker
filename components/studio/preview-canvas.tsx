'use client';

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { Maximize2, Move, ScanLine } from 'lucide-react';

import { positionFromPointer, type DragStart } from '@/src/editor/drag';
import {
  areEditorFontsReady,
  editorFontRequirementKey,
  editorUsesGoogleFonts,
  loadEditorFonts,
} from '@/src/editor/font-loader';
import { renderTitleCard } from '@/src/editor/renderer';
import type {
  BackgroundAsset,
  EditorState,
  PositionSettings,
} from '@/src/types';

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
  const failedFontAttemptRef = useRef<{
    key: string;
    message: string;
  } | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);
  const [announcedPosition, setAnnouncedPosition] = useState(state.position);
  const fontRequirementKey = editorFontRequirementKey(state);
  const [readyFontKey, setReadyFontKey] = useState<string | null>(() =>
    areEditorFontsReady(state) ? fontRequirementKey : null,
  );
  const [fontPhase, setFontPhase] = useState<'ready' | 'loading' | 'error'>(
    () => (areEditorFontsReady(state) ? 'ready' : 'loading'),
  );
  const [fontError, setFontError] = useState('');
  const [fontRetry, setFontRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const attemptKey = `${fontRequirementKey}\u0000${fontRetry}`;
    const commit = (callback: () => void) => {
      queueMicrotask(() => {
        if (!cancelled) callback();
      });
    };

    if (areEditorFontsReady(state)) {
      failedFontAttemptRef.current = null;
      commit(() => {
        setReadyFontKey(fontRequirementKey);
        setFontPhase('ready');
        setFontError('');
      });
      return () => {
        cancelled = true;
      };
    }

    if (failedFontAttemptRef.current?.key === attemptKey) {
      const failureMessage = failedFontAttemptRef.current.message;
      commit(() => {
        setReadyFontKey(fontRequirementKey);
        setFontPhase('error');
        setFontError(failureMessage);
      });
      return () => {
        cancelled = true;
      };
    }

    commit(() => {
      setReadyFontKey(null);
      setFontPhase('loading');
      setFontError('');
    });
    void loadEditorFonts(state).then(
      () => {
        if (cancelled) return;
        failedFontAttemptRef.current = null;
        setReadyFontKey(fontRequirementKey);
        setFontPhase('ready');
      },
      (error: unknown) => {
        if (cancelled) return;
        const message =
          error instanceof Error
            ? error.message
            : 'Google Fontsを読み込めませんでした。';
        failedFontAttemptRef.current = { key: attemptKey, message };
        setReadyFontKey(fontRequirementKey);
        setFontPhase('error');
        setFontError(message);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [fontRequirementKey, fontRetry, state]);

  useEffect(() => {
    if (readyFontKey !== fontRequirementKey) return;
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
  }, [background, fontRequirementKey, readyFontKey, state]);

  useEffect(() => {
    if (fontPhase !== 'error') return;
    const retryWhenOnline = () => setFontRetry((current) => current + 1);
    window.addEventListener('online', retryWhenOnline);
    return () => window.removeEventListener('online', retryWhenOnline);
  }, [fontPhase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let frame = 0;
    const updateZoom = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const bounds = canvas.getBoundingClientRect();
        if (bounds.width <= 0 || bounds.height <= 0) return;
        setZoom(
          Math.round(
            Math.min(
              bounds.width / state.canvas.width,
              bounds.height / state.canvas.height,
            ) * 100,
          ),
        );
      });
    };
    updateZoom();
    const observer = new ResizeObserver(updateZoom);
    observer.observe(canvas);
    window.addEventListener('resize', updateZoom);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', updateZoom);
    };
  }, [state.canvas.height, state.canvas.width]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAnnouncedPosition(state.position);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [state.position]);

  const beginDrag = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.focus();
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

  return (
    <section className="preview-panel flex min-h-[390px] flex-col overflow-hidden rounded-xl border bg-card lg:min-h-[calc(100vh-105px)]">
      <div className="flex min-h-13 items-center justify-between border-b px-4 py-2.5">
        <div>
          <div className="flex items-center gap-2">
            <ScanLine className="size-3.5 text-primary" />
            <h2 className="text-xs font-semibold tracking-wide">プレビュー</h2>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {state.canvas.width} × {state.canvas.height} · 約{zoom ?? '…'}%
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="hidden items-center gap-1.5 sm:flex">
            <Move className="size-3" /> ドラッグで移動
          </span>
          <span className="flex items-center gap-1.5 rounded-md border bg-background/40 px-2 py-1">
            <Maximize2 className="size-3" />
            {state.canvas.safeArea
              ? `SAFE ${state.canvas.safeArea}%`
              : 'GUIDE OFF'}
          </span>
        </div>
      </div>

      <div className="checkerboard grid flex-1 place-items-center overflow-hidden p-3 sm:p-6 lg:p-8">
        <div
          className="relative w-full max-w-[1150px] overflow-hidden border border-white/10 bg-black/10 shadow-[0_28px_80px_rgba(0,0,0,.48)]"
          style={{
            aspectRatio: `${state.canvas.width} / ${state.canvas.height}`,
          }}
        >
          <figure className="absolute inset-0 size-full">
            <canvas
              ref={canvasRef}
              aria-label={`${state.mainText || '無題'}のエリアタイトル配置`}
              aria-describedby="preview-description preview-position-status"
              tabIndex={0}
              onPointerDown={beginDrag}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onKeyDown={moveWithKeyboard}
              className="absolute inset-0 size-full cursor-move touch-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
            />
            <figcaption id="preview-description" className="sr-only">
              {state.mainText || '無題'}
              {state.subText ? `、${state.subText}` : ''}{' '}
              のエリアタイトルプレビュー。ドラッグまたは矢印キーで位置を変更できます。Shiftキーと矢印キーで5%ずつ移動します。
            </figcaption>
            <output
              id="preview-position-status"
              className="sr-only"
              aria-live="polite"
              aria-atomic="true"
            >
              タイトル位置、横{announcedPosition.x.toFixed(1)}%、縦
              {announcedPosition.y.toFixed(1)}%
            </output>
          </figure>
        </div>
      </div>

      <div className="flex min-h-10 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t px-4 py-2 text-[10px] text-muted-foreground">
        <span>
          位置 X {state.position.x.toFixed(1)}% · Y{' '}
          {state.position.y.toFixed(1)}%
        </span>
        <output
          aria-live="polite"
          aria-atomic="true"
          title={fontError || undefined}
          className={
            fontPhase === 'error'
              ? 'text-amber-700 dark:text-amber-300'
              : undefined
          }
        >
          {fontPhase === 'loading' ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 animate-pulse rounded-full bg-primary" />
              フォント読込中…
            </span>
          ) : fontPhase === 'error' ? (
            <span className="inline-flex items-center gap-2">
              代替フォントで表示中
              <button
                type="button"
                className="underline underline-offset-2 hover:text-foreground"
                onClick={() => setFontRetry((current) => current + 1)}
              >
                再試行
              </button>
            </span>
          ) : editorUsesGoogleFonts(state) ? (
            'Google Fonts 準備完了'
          ) : (
            '端末内フォント'
          )}
        </output>
        <span>
          {background ? `背景: ${background.name}` : '透明背景で出力'}
        </span>
      </div>
    </section>
  );
}
