'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  Download,
  Dices,
  LockKeyhole,
  RotateCcw,
  Settings2,
  Sparkles,
  SwatchBook,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EditorControls } from '@/components/studio/editor-controls';
import { HeaderTools } from '@/components/studio/header-tools';
import { PresetPanel } from '@/components/studio/preset-panel';
import { PreviewCanvas } from '@/components/studio/preview-canvas';
import { PRESETS, applyPresetToState } from '@/src/data/presets';
import { exportTitleCard, type ExportMode } from '@/src/editor/export';
import { readSupportedImageDimensions } from '@/src/editor/image-dimensions.mjs';
import { cloneDefaultState } from '@/src/state/defaults';
import {
  clearEditorState,
  loadEditorState,
  saveEditorState,
} from '@/src/state/storage';
import type {
  AreaTitlePreset,
  BackgroundAsset,
  EditorState,
} from '@/src/types';

const DESKTOP_LAYOUT_QUERY = '(min-width: 1024px)';
const MAX_BACKGROUND_EDGE = 8192;
const MAX_BACKGROUND_PIXELS = 4096 * 4096;

function subscribeToDesktopLayout(onChange: () => void) {
  const query = window.matchMedia(DESKTOP_LAYOUT_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function getDesktopLayoutSnapshot() {
  return window.matchMedia(DESKTOP_LAYOUT_QUERY).matches;
}

function getServerDesktopLayoutSnapshot() {
  return false;
}

export function AreaTitleStudio() {
  const isDesktopLayout = useSyncExternalStore(
    subscribeToDesktopLayout,
    getDesktopLayoutSnapshot,
    getServerDesktopLayoutSnapshot,
  );
  const [state, setState] = useState<EditorState>(() => cloneDefaultState());
  const [hydrated, setHydrated] = useState(false);
  const [background, setBackground] = useState<BackgroundAsset | null>(null);
  const backgroundRef = useRef<BackgroundAsset | null>(null);
  const pendingBackgroundRef = useRef<{
    image: HTMLImageElement;
    url: string;
  } | null>(null);
  const backgroundRequestRef = useRef(0);
  const [status, setStatus] = useState(
    'タイトル本文と画像はアップロードしません。Google Fontsは選択時のみ取得します',
  );
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setState(loadEditorState());
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => saveEditorState(state), 250);
    return () => window.clearTimeout(timer);
  }, [hydrated, state]);

  const cancelPendingBackground = useCallback(() => {
    backgroundRequestRef.current += 1;
    const pending = pendingBackgroundRef.current;
    if (!pending) return;
    pendingBackgroundRef.current = null;
    pending.image.onload = null;
    pending.image.onerror = null;
    pending.image.src = '';
    URL.revokeObjectURL(pending.url);
  }, []);

  useEffect(() => {
    return () => {
      cancelPendingBackground();
      if (backgroundRef.current) URL.revokeObjectURL(backgroundRef.current.url);
    };
  }, [cancelPendingBackground]);

  const replaceBackground = (asset: BackgroundAsset | null) => {
    if (backgroundRef.current) URL.revokeObjectURL(backgroundRef.current.url);
    backgroundRef.current = asset;
    setBackground(asset);
  };

  const loadBackground = async (file: File) => {
    cancelPendingBackground();
    const requestId = backgroundRequestRef.current;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setStatus('PNG・JPEG・WEBP形式の画像を選択してください');
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      setStatus('背景画像は30MB以下にしてください');
      return;
    }

    setStatus('背景画像を安全に確認しています…');
    let dimensions;
    try {
      dimensions = readSupportedImageDimensions(
        await file.arrayBuffer(),
        file.type,
      );
    } catch {
      if (requestId === backgroundRequestRef.current) {
        setStatus('背景画像を読み込めませんでした');
      }
      return;
    }
    if (requestId !== backgroundRequestRef.current) return;
    if (!dimensions) {
      setStatus('画像データが選択された形式と一致しないか、破損しています');
      return;
    }
    if (
      dimensions.width > MAX_BACKGROUND_EDGE ||
      dimensions.height > MAX_BACKGROUND_EDGE ||
      dimensions.width * dimensions.height > MAX_BACKGROUND_PIXELS
    ) {
      setStatus('背景画像は最大8192px・約16.8メガピクセルまでです');
      return;
    }

    const url = URL.createObjectURL(file);
    const image = new Image();
    pendingBackgroundRef.current = { image, url };
    image.onload = () => {
      if (pendingBackgroundRef.current?.image !== image) return;
      pendingBackgroundRef.current = null;
      image.onload = null;
      image.onerror = null;
      const { naturalWidth, naturalHeight } = image;
      if (
        naturalWidth <= 0 ||
        naturalHeight <= 0 ||
        naturalWidth > MAX_BACKGROUND_EDGE ||
        naturalHeight > MAX_BACKGROUND_EDGE ||
        naturalWidth * naturalHeight > MAX_BACKGROUND_PIXELS
      ) {
        URL.revokeObjectURL(url);
        image.src = '';
        setStatus('背景画像は最大8192px・約16.8メガピクセルまでです');
        return;
      }
      replaceBackground({ image, url, name: file.name });
      setStatus(`背景「${file.name}」を読み込みました（端末内のみ）`);
    };
    image.onerror = () => {
      if (pendingBackgroundRef.current?.image !== image) return;
      pendingBackgroundRef.current = null;
      image.onload = null;
      image.onerror = null;
      URL.revokeObjectURL(url);
      setStatus('背景画像を読み込めませんでした');
    };
    image.src = url;
  };

  const applyPreset = (preset: AreaTitlePreset) => {
    setState((current) => applyPresetToState(current, preset));
    setStatus(`${preset.name} のスタイルを適用しました`);
  };

  const randomize = () => {
    const candidates = PRESETS.filter((preset) => preset.id !== state.presetId);
    const preset =
      candidates[Math.floor(Math.random() * candidates.length)] ?? PRESETS[0];
    applyPreset(preset);
  };

  const reset = () => {
    cancelPendingBackground();
    clearEditorState();
    replaceBackground(null);
    setState(cloneDefaultState());
    setStatus('初期状態に戻しました');
  };

  const exportImage = async (mode: ExportMode) => {
    if (mode === 'background' && !background) {
      setStatus('背景込みPNGには背景画像が必要です');
      return;
    }
    setExporting(true);
    setStatus('フォントを確認してPNGを書き出しています…');
    try {
      const result = await exportTitleCard(state, mode, background?.image);
      setStatus(`PNGを保存しました（${result.width} × ${result.height}px）`);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : 'PNGの保存に失敗しました',
      );
    } finally {
      setExporting(false);
    }
  };

  const editorPanel = (
    <aside
      key="editor"
      className="flex min-h-[680px] flex-col overflow-hidden rounded-xl border bg-card/95 lg:h-[calc(100dvh-105px)] lg:min-h-0"
    >
      <Tabs
        defaultValue="edit"
        className="min-h-0 flex-1 flex-col gap-0 overflow-hidden"
      >
        <div className="border-b p-2.5">
          <TabsList className="grid h-9 w-full grid-cols-2 bg-background/55">
            <TabsTrigger value="edit">
              <Settings2 /> 編集
            </TabsTrigger>
            <TabsTrigger value="presets">
              <SwatchBook /> プリセット
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent
          value="edit"
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <EditorControls
            state={state}
            setState={setState}
            background={background}
            onBackgroundFile={loadBackground}
            onRemoveBackground={() => {
              cancelPendingBackground();
              replaceBackground(null);
              setStatus('背景画像を削除しました');
            }}
            onExport={exportImage}
            exporting={exporting}
          />
        </TabsContent>
        <TabsContent
          value="presets"
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <PresetPanel selectedId={state.presetId} onApply={applyPreset} />
        </TabsContent>
      </Tabs>
      <output
        aria-live="polite"
        aria-atomic="true"
        className="flex min-h-10 items-center border-t bg-background/30 px-4 py-2 text-[10px] text-muted-foreground"
      >
        <span className="mr-2 size-1.5 shrink-0 rounded-full bg-primary" />
        <span className="min-w-0 flex-1 truncate">{status}</span>
        <a
          href="THIRD_PARTY_LICENSES.txt"
          target="_blank"
          rel="noreferrer"
          className="ml-3 shrink-0 underline-offset-2 hover:text-foreground hover:underline"
        >
          第三者ライセンス
        </a>
        <a
          href="FONT_NOTICES.txt"
          target="_blank"
          rel="noreferrer"
          className="ml-3 shrink-0 underline-offset-2 hover:text-foreground hover:underline"
        >
          書体について
        </a>
      </output>
    </aside>
  );

  const previewPanel = (
    <PreviewCanvas
      key="preview"
      state={state}
      background={background}
      onPositionChange={(position) =>
        setState((current) => ({ ...current, position }))
      }
    />
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_72%_4%,rgba(214,181,110,.075),transparent_30%)]">
      <header className="sticky top-0 z-40 grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2 border-b bg-background/95 px-3 py-2 backdrop-blur-xl sm:px-5 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:gap-x-4 lg:px-7">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-md border border-primary/35 bg-primary/10 text-primary">
            <Sparkles className="size-4" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate font-[family-name:var(--font-heading)] text-[13px] tracking-[0.08em] sm:text-[15px]">
              AREA TITLE MAKER
            </h1>
            <p className="hidden text-[9px] tracking-[0.12em] text-muted-foreground sm:block">
              GAME TITLE CARD STUDIO
            </p>
          </div>
        </div>

        <div className="col-span-2 row-start-2 flex items-center justify-end gap-1.5 border-t pt-2 sm:gap-2 lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:border-0 lg:pt-0">
          <span className="mr-2 hidden items-center gap-1.5 text-[9px] text-muted-foreground xl:flex">
            <LockKeyhole className="size-3 text-primary" />{' '}
            画像は外部へ送信されません
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="ランダムなデザインを適用"
            onClick={randomize}
          >
            <Dices /> <span>ランダム</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="初期状態に戻す"
            onClick={() => {
              if (
                window.confirm(
                  '入力内容と編集設定を消去し、初期状態に戻しますか？（お気に入りは保持されます）',
                )
              ) {
                reset();
              }
            }}
          >
            <RotateCcw /> <span>リセット</span>
          </Button>
          <Button
            type="button"
            size="sm"
            aria-label="透過PNGとして保存"
            disabled={exporting}
            onClick={() => exportImage('transparent')}
          >
            <Download /> <span>PNG保存</span>
          </Button>
        </div>
        <div className="col-start-2 row-start-1 lg:col-start-3 lg:border-l lg:pl-3">
          <HeaderTools />
        </div>
      </header>

      <div className="mx-auto grid max-w-[1900px] gap-3 p-3 lg:grid-cols-[430px_minmax(0,1fr)] lg:gap-4 lg:p-5">
        {isDesktopLayout
          ? [editorPanel, previewPanel]
          : [previewPanel, editorPanel]}
      </div>
    </main>
  );
}
