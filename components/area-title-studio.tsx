'use client';

import { useEffect, useRef, useState } from 'react';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { EditorControls } from '@/components/studio/editor-controls';
import { PresetPanel } from '@/components/studio/preset-panel';
import { PreviewCanvas } from '@/components/studio/preview-canvas';
import { PRESETS, applyPresetToState } from '@/src/data/presets';
import { exportTitleCard, type ExportMode } from '@/src/editor/export';
import { cloneDefaultState } from '@/src/state/defaults';
import {
  clearEditorState,
  loadEditorState,
  saveEditorState,
} from '@/src/state/storage';
import type { AreaTitlePreset, BackgroundAsset, EditorState } from '@/src/types';

export function AreaTitleStudio() {
  const [state, setState] = useState<EditorState>(() => cloneDefaultState());
  const [hydrated, setHydrated] = useState(false);
  const [background, setBackground] = useState<BackgroundAsset | null>(null);
  const backgroundRef = useRef<BackgroundAsset | null>(null);
  const [status, setStatus] = useState('すべての処理はこのブラウザ内で完結します');
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

  useEffect(() => {
    return () => {
      if (backgroundRef.current) URL.revokeObjectURL(backgroundRef.current.url);
    };
  }, []);

  const replaceBackground = (asset: BackgroundAsset | null) => {
    if (backgroundRef.current) URL.revokeObjectURL(backgroundRef.current.url);
    backgroundRef.current = asset;
    setBackground(asset);
  };

  const loadBackground = (file: File) => {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setStatus('PNG・JPEG・WEBP形式の画像を選択してください');
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      setStatus('背景画像は30MB以下にしてください');
      return;
    }

    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      replaceBackground({ image, url, name: file.name });
      setStatus(`背景「${file.name}」を読み込みました（端末内のみ）`);
    };
    image.onerror = () => {
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
    const preset = candidates[Math.floor(Math.random() * candidates.length)] ?? PRESETS[0];
    applyPreset(preset);
  };

  const reset = () => {
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
    setStatus('PNGを書き出しています…');
    try {
      const result = await exportTitleCard(state, mode, background?.image);
      setStatus(`PNGを保存しました（${result.width} × ${result.height}px）`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'PNGの保存に失敗しました');
    } finally {
      setExporting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_72%_4%,rgba(214,181,110,.075),transparent_30%)]">
      <header className="sticky top-0 z-40 flex min-h-16 items-center justify-between border-b bg-[#141513]/95 px-3 py-2 backdrop-blur-xl sm:px-5 lg:px-7">
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

        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="mr-2 hidden items-center gap-1.5 text-[9px] text-muted-foreground xl:flex">
            <LockKeyhole className="size-3 text-primary" /> 画像は外部へ送信されません
          </span>
          <Button type="button" variant="ghost" size="sm" aria-label="ランダムなデザインを適用" onClick={randomize}>
            <Dices /> <span className="hidden sm:inline">ランダム</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="初期状態に戻す"
            onClick={() => {
              if (window.confirm('入力内容と保存済み設定を消去し、初期状態に戻しますか？')) {
                reset();
              }
            }}
          >
            <RotateCcw /> <span className="hidden sm:inline">リセット</span>
          </Button>
          <Button type="button" size="sm" aria-label="透過PNGとして保存" disabled={exporting} onClick={() => exportImage('transparent')}>
            <Download /> <span className="hidden min-[420px]:inline">PNG保存</span>
          </Button>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1900px] gap-3 p-3 lg:grid-cols-[430px_minmax(0,1fr)] lg:gap-4 lg:p-5">
        <aside className="order-2 flex min-h-[680px] flex-col overflow-hidden rounded-xl border bg-card/95 lg:order-1 lg:h-[calc(100vh-105px)] lg:min-h-0">
          <Tabs defaultValue="edit" className="min-h-0 flex-1 gap-0">
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
            <TabsContent value="edit" className="min-h-0 overflow-hidden">
              <EditorControls
                state={state}
                setState={setState}
                background={background}
                onBackgroundFile={loadBackground}
                onRemoveBackground={() => {
                  replaceBackground(null);
                  setStatus('背景画像を削除しました');
                }}
                onExport={exportImage}
                exporting={exporting}
              />
            </TabsContent>
            <TabsContent value="presets" className="min-h-0 overflow-hidden">
              <PresetPanel selectedId={state.presetId} onApply={applyPreset} />
            </TabsContent>
          </Tabs>
          <output
            aria-live="polite"
            aria-atomic="true"
            className="flex min-h-10 items-center border-t bg-background/30 px-4 py-2 text-[10px] text-muted-foreground"
          >
            <span className="mr-2 size-1.5 shrink-0 rounded-full bg-primary" />
            <span className="truncate">{status}</span>
          </output>
        </aside>

        <PreviewCanvas
          state={state}
          background={background}
          onPositionChange={(position) => setState((current) => ({ ...current, position }))}
        />
      </div>
    </main>
  );
}
