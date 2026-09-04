'use client';

import {
  useState,
  type ChangeEvent,
  type Dispatch,
  type KeyboardEvent,
  type SetStateAction,
} from 'react';
import {
  AlignCenter,
  ArrowDown,
  ArrowUp,
  Download,
  ImageOff,
  ImagePlus,
  Scissors,
} from 'lucide-react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  EDITOR_FONT_WEIGHTS,
  FONT_OPTIONS,
  findFontOption,
  nearestSupportedFontWeight,
  type FontCategory,
} from '@/src/data/fonts';
import { SYMBOLS } from '@/src/data/symbols';
import type {
  BackgroundAsset,
  EditorState,
  LayoutType,
  LineStyle,
  TextStyle,
} from '@/src/types';

const lineOptions: Array<{ value: LineStyle; label: string }> = [
  { value: 'none', label: 'なし' },
  { value: 'single', label: '一本線' },
  { value: 'double', label: '二重線' },
  { value: 'bold', label: '太線' },
  { value: 'thin', label: '細線' },
  { value: 'dashed', label: '破線' },
  { value: 'dotted', label: '点線' },
  { value: 'split', label: '中央分割線' },
  { value: 'sides', label: '左右独立線' },
  { value: 'fade', label: 'フェード線' },
];

const canvasSizes = [
  [1920, 1080],
  [1280, 720],
  [1600, 900],
  [1080, 1080],
  [1920, 480],
  [1280, 320],
] as const;

const layoutLabels: Record<LayoutType, string> = {
  A: 'タイトル → 線',
  B: '線 → タイトル',
  C: 'タイトル・線・サブ',
  D: '線・タイトル・サブ',
  E: '線 ─ タイトル ─ 線',
  F: 'タイトル・サブ',
  G: '上下線で囲む',
};

const fontGroups: Array<{ category: FontCategory; label: string }> = [
  { category: 'google-japanese', label: 'Google Fonts · 日本語' },
  { category: 'google-latin', label: 'Google Fonts · 英字向け' },
  { category: 'system', label: '端末内フォント' },
];

const JAPANESE_TEXT = /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/;

type EditorControlsProps = {
  state: EditorState;
  setState: Dispatch<SetStateAction<EditorState>>;
  background: BackgroundAsset | null;
  onBackgroundFile: (file: File) => void;
  onRemoveBackground: () => void;
  onExport: (mode: 'transparent' | 'trimmed' | 'background') => void;
  exporting: boolean;
};

function compactNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function RangeControl({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
  disabled = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`space-y-2 ${disabled ? 'opacity-45' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span className="min-w-14 rounded border bg-background/40 px-1.5 py-0.5 text-right font-mono text-[10px] text-foreground">
          {compactNumber(value)}
          {unit}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-label={label}
        onValueChange={(next) => onChange(Array.isArray(next) ? next[0] : next)}
      />
    </div>
  );
}

function ColorControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid grid-cols-[1fr_auto] items-end gap-2">
      <span className="space-y-1.5">
        <span className="block text-[11px] text-muted-foreground">{label}</span>
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 bg-background/45 font-mono text-[11px] uppercase"
        />
      </span>
      <input
        type="color"
        value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#ffffff'}
        onChange={(event) => onChange(event.target.value)}
        aria-label={`${label}を選択`}
        className="size-8 cursor-pointer rounded-md border bg-transparent p-1"
      />
    </label>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border bg-background/25 px-3 py-2.5">
      <span>
        <span className="block text-[11px] font-medium">{label}</span>
        {description && (
          <span className="mt-0.5 block text-[9px] text-muted-foreground">
            {description}
          </span>
        )}
      </span>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
      />
    </label>
  );
}

function TextStyleControls({
  title,
  text,
  style,
  onChange,
}: {
  title: string;
  text: string;
  style: TextStyle;
  onChange: (style: TextStyle) => void;
}) {
  const patch = (next: Partial<TextStyle>) => onChange({ ...style, ...next });
  const selectedFont = findFontOption(style.fontFamily);
  const weights = selectedFont?.weights ?? EDITOR_FONT_WEIGHTS;
  const italicAvailable = selectedFont?.italic ?? true;

  const changeFont = (fontFamily: string) => {
    const font = findFontOption(fontFamily);
    patch({
      fontFamily,
      weight: nearestSupportedFontWeight(font, style.weight),
      italic: Boolean(font?.italic && style.italic),
    });
  };

  return (
    <div className="space-y-3 rounded-lg border bg-background/20 p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-semibold">{title}</h4>
        <span
          className="size-2 rounded-full"
          style={{ backgroundColor: style.color }}
        />
      </div>
      <label className="block space-y-1.5">
        <span className="text-[11px] text-muted-foreground">フォント</span>
        <NativeSelect
          value={style.fontFamily}
          onChange={(event) => changeFont(event.target.value)}
          aria-label={`${title}のフォント`}
          className="w-full"
        >
          {fontGroups.map((group) => (
            <NativeSelectOptGroup key={group.category} label={group.label}>
              {FONT_OPTIONS.filter(
                (font) => font.category === group.category,
              ).map((font) => (
                <NativeSelectOption key={font.id} value={font.value}>
                  {font.label}
                </NativeSelectOption>
              ))}
            </NativeSelectOptGroup>
          ))}
        </NativeSelect>
        <span className="block text-[9px] leading-relaxed text-muted-foreground">
          {selectedFont?.source === 'google'
            ? !selectedFont.supportsJapanese && JAPANESE_TEXT.test(text)
              ? '英字向けです。日本語部分は端末内フォントで補完します。'
              : '選択時のみGoogle Fontsから必要な書体を読み込みます。'
            : '端末内フォントを使用します。外部通信はありません。'}
        </span>
      </label>
      <RangeControl
        label="文字サイズ"
        value={style.size}
        min={12}
        max={180}
        unit="px"
        onChange={(size) => patch({ size })}
      />
      <ColorControl
        label="文字色"
        value={style.color}
        onChange={(color) => patch({ color })}
      />
      <RangeControl
        label="文字間"
        value={style.letterSpacing}
        min={-2}
        max={40}
        step={0.5}
        unit="px"
        onChange={(letterSpacing) => patch({ letterSpacing })}
      />
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1.5">
          <span className="text-[11px] text-muted-foreground">太さ</span>
          <NativeSelect
            value={String(style.weight)}
            onChange={(event) => patch({ weight: Number(event.target.value) })}
            aria-label={`${title}の太さ`}
            className="w-full"
          >
            {weights.map((weight) => (
              <NativeSelectOption key={weight} value={weight}>
                {weight}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
        <div className="space-y-1.5">
          <span className="text-[11px] text-muted-foreground">スタイル</span>
          <Button
            type="button"
            variant={style.italic ? 'secondary' : 'outline'}
            aria-pressed={style.italic}
            disabled={!italicAvailable}
            onClick={() => patch({ italic: !style.italic })}
            className="w-full italic"
          >
            {italicAvailable ? 'Italic' : 'Italicなし'}
          </Button>
        </div>
      </div>
      <RangeControl
        label="透明度"
        value={Math.round(style.opacity * 100)}
        min={0}
        max={100}
        unit="%"
        onChange={(opacity) => patch({ opacity: opacity / 100 })}
      />
    </div>
  );
}

export function EditorControls({
  state,
  setState,
  background,
  onBackgroundFile,
  onRemoveBackground,
  onExport,
  exporting,
}: EditorControlsProps) {
  const update = (patch: Partial<EditorState>) =>
    setState((current) => ({ ...current, ...patch }));

  const updateEffects = (effects: EditorState['effects']) =>
    update({ effects, presetId: 'custom' });

  const [canvasDraft, setCanvasDraft] = useState<
    Record<'width' | 'height', { value: string; source: number } | null>
  >({ width: null, height: null });

  const canvasDraftValue = (key: 'width' | 'height') => {
    const draft = canvasDraft[key];
    return draft?.source === state.canvas[key]
      ? draft.value
      : String(state.canvas[key]);
  };

  const canvasPreset = canvasSizes.find(
    ([width, height]) =>
      width === state.canvas.width && height === state.canvas.height,
  );

  const commitCanvasDimension = (key: 'width' | 'height') => {
    const min = key === 'width' ? 320 : 180;
    const currentValue = state.canvas[key];
    const raw = canvasDraftValue(key).trim();
    const parsed = raw === '' ? Number.NaN : Number(raw);
    const value = Number.isFinite(parsed)
      ? Math.round(Math.max(min, Math.min(4096, parsed)))
      : currentValue;
    setCanvasDraft((current) => ({ ...current, [key]: null }));
    if (value !== currentValue) {
      setState((current) => ({
        ...current,
        canvas: { ...current.canvas, [key]: value },
      }));
    }
  };

  const canvasDimensionKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    key: 'width' | 'height',
  ) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitCanvasDimension(key);
      event.currentTarget.blur();
    } else if (event.key === 'Escape') {
      setCanvasDraft((current) => ({ ...current, [key]: null }));
      event.currentTarget.blur();
    }
  };

  const fileChanged = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onBackgroundFile(file);
    event.currentTarget.value = '';
  };

  return (
    <section
      aria-label="編集設定"
      className="h-full min-h-0 flex-1 overflow-visible overscroll-auto scrollbar-gutter-stable scrollbar-thin lg:touch-pan-y lg:overflow-y-auto lg:overscroll-contain"
    >
      <div className="space-y-3 border-b p-4">
        <label htmlFor="main-title" className="block space-y-1.5">
          <span className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>メインタイトル</span>
            <span className="font-mono text-[9px]">
              {state.mainText.length}/100
            </span>
          </span>
          <Textarea
            id="main-title"
            value={state.mainText}
            maxLength={100}
            rows={2}
            onChange={(event) => update({ mainText: event.target.value })}
            className="min-h-12 resize-none bg-background/55 text-[13px]"
          />
        </label>
        <label htmlFor="sub-title" className="block space-y-1.5">
          <span className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>サブタイトル（任意）</span>
            <span className="font-mono text-[9px]">
              {state.subText.length}/100
            </span>
          </span>
          <Input
            id="sub-title"
            value={state.subText}
            maxLength={100}
            onChange={(event) => update({ subText: event.target.value })}
            className="h-9 bg-background/55"
          />
        </label>
      </div>

      <Accordion
        multiple
        defaultValue={['text', 'layout', 'decoration']}
        className="px-4"
      >
        <AccordionItem value="text">
          <AccordionTrigger className="py-3.5 hover:no-underline">
            文字スタイル
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pb-4">
            <TextStyleControls
              title="メイン"
              text={state.mainText}
              style={state.mainTextStyle}
              onChange={(mainTextStyle) =>
                update({ mainTextStyle, presetId: 'custom' })
              }
            />
            <TextStyleControls
              title="サブ"
              text={state.subText}
              style={state.subTextStyle}
              onChange={(subTextStyle) =>
                update({ subTextStyle, presetId: 'custom' })
              }
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="layout">
          <AccordionTrigger className="py-3.5 hover:no-underline">
            レイアウト・位置
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(layoutLabels) as LayoutType[]).map((layout) => (
                <button
                  key={layout}
                  type="button"
                  aria-pressed={state.layout === layout}
                  onClick={() => update({ layout, presetId: 'custom' })}
                  className={`rounded-lg border px-2 py-2.5 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-primary ${
                    state.layout === layout
                      ? 'border-primary/60 bg-primary/[.08] text-primary'
                      : 'bg-background/25 hover:border-primary/25'
                  }`}
                >
                  <span className="mr-1.5 font-mono text-[10px]">{layout}</span>
                  <span className="text-[9px]">{layoutLabels[layout]}</span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => update({ position: { x: 0, y: -22 } })}
              >
                <ArrowUp /> 上
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => update({ position: { x: 0, y: 0 } })}
              >
                <AlignCenter /> 中央
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => update({ position: { x: 0, y: 22 } })}
              >
                <ArrowDown /> 下
              </Button>
            </div>
            <RangeControl
              label="左右位置"
              value={state.position.x}
              min={-50}
              max={50}
              step={0.5}
              unit="%"
              onChange={(x) => update({ position: { ...state.position, x } })}
            />
            <RangeControl
              label="上下位置"
              value={state.position.y}
              min={-50}
              max={50}
              step={0.5}
              unit="%"
              onChange={(y) => update({ position: { ...state.position, y } })}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="decoration">
          <AccordionTrigger className="py-3.5 hover:no-underline">
            装飾線
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <label htmlFor="line-style" className="block space-y-1.5">
              <span className="text-[11px] text-muted-foreground">
                線の種類
              </span>
              <NativeSelect
                id="line-style"
                value={state.decoration.lineStyle}
                onChange={(event) =>
                  update({
                    decoration: {
                      ...state.decoration,
                      lineStyle: event.target.value as LineStyle,
                    },
                    presetId: 'custom',
                  })
                }
                className="w-full"
              >
                {lineOptions.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </label>
            <div>
              <p className="mb-2 text-[11px] text-muted-foreground">中央装飾</p>
              <div className="grid grid-cols-8 gap-1.5">
                {SYMBOLS.map((symbol) => (
                  <button
                    key={symbol || 'none'}
                    type="button"
                    aria-label={symbol ? `中央装飾 ${symbol}` : '中央装飾なし'}
                    aria-pressed={state.decoration.symbol === symbol}
                    onClick={() =>
                      update({
                        decoration: { ...state.decoration, symbol },
                        presetId: 'custom',
                      })
                    }
                    className={`grid aspect-square place-items-center rounded-md border text-xs outline-none transition focus-visible:ring-2 focus-visible:ring-primary ${
                      state.decoration.symbol === symbol
                        ? 'border-primary/60 bg-primary/10 text-primary'
                        : 'bg-background/30 hover:border-primary/25'
                    }`}
                  >
                    {symbol || '—'}
                  </button>
                ))}
              </div>
            </div>
            <RangeControl
              label="線の長さ"
              value={state.decoration.width}
              min={100}
              max={1500}
              step={10}
              unit="px"
              onChange={(width) =>
                update({
                  decoration: { ...state.decoration, width },
                  presetId: 'custom',
                })
              }
              disabled={state.decoration.lineStyle === 'none'}
            />
            <RangeControl
              label="線の太さ"
              value={state.decoration.thickness}
              min={0.5}
              max={12}
              step={0.5}
              unit="px"
              onChange={(thickness) =>
                update({
                  decoration: { ...state.decoration, thickness },
                  presetId: 'custom',
                })
              }
              disabled={state.decoration.lineStyle === 'none'}
            />
            <RangeControl
              label="中央との距離"
              value={state.decoration.gap}
              min={0}
              max={140}
              step={2}
              unit="px"
              onChange={(gap) =>
                update({
                  decoration: { ...state.decoration, gap },
                  presetId: 'custom',
                })
              }
              disabled={state.decoration.lineStyle === 'none'}
            />
            <RangeControl
              label="左右余白"
              value={state.decoration.sidePadding}
              min={0}
              max={300}
              step={5}
              unit="px"
              onChange={(sidePadding) =>
                update({
                  decoration: { ...state.decoration, sidePadding },
                  presetId: 'custom',
                })
              }
              disabled={state.decoration.lineStyle === 'none'}
            />
            <ColorControl
              label="線の色"
              value={state.decoration.color}
              onChange={(color) =>
                update({
                  decoration: { ...state.decoration, color },
                  presetId: 'custom',
                })
              }
            />
            <RangeControl
              label="線の透明度"
              value={Math.round(state.decoration.opacity * 100)}
              min={0}
              max={100}
              unit="%"
              onChange={(opacity) =>
                update({
                  decoration: { ...state.decoration, opacity: opacity / 100 },
                  presetId: 'custom',
                })
              }
              disabled={state.decoration.lineStyle === 'none'}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="effects">
          <AccordionTrigger className="py-3.5 hover:no-underline">
            エフェクト
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <div className="space-y-3 rounded-lg border bg-background/20 p-3">
              <ToggleRow
                label="影"
                checked={state.effects.shadow.enabled}
                onChange={(enabled) =>
                  updateEffects({
                    ...state.effects,
                    shadow: { ...state.effects.shadow, enabled },
                  })
                }
              />
              <ColorControl
                label="影色"
                value={state.effects.shadow.color}
                onChange={(color) =>
                  updateEffects({
                    ...state.effects,
                    shadow: { ...state.effects.shadow, color },
                  })
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <RangeControl
                  label="X"
                  value={state.effects.shadow.x}
                  min={-30}
                  max={30}
                  unit="px"
                  onChange={(x) =>
                    updateEffects({
                      ...state.effects,
                      shadow: { ...state.effects.shadow, x },
                    })
                  }
                  disabled={!state.effects.shadow.enabled}
                />
                <RangeControl
                  label="Y"
                  value={state.effects.shadow.y}
                  min={-30}
                  max={30}
                  unit="px"
                  onChange={(y) =>
                    updateEffects({
                      ...state.effects,
                      shadow: { ...state.effects.shadow, y },
                    })
                  }
                  disabled={!state.effects.shadow.enabled}
                />
              </div>
              <RangeControl
                label="Blur"
                value={state.effects.shadow.blur}
                min={0}
                max={60}
                unit="px"
                onChange={(blur) =>
                  updateEffects({
                    ...state.effects,
                    shadow: { ...state.effects.shadow, blur },
                  })
                }
                disabled={!state.effects.shadow.enabled}
              />
              <RangeControl
                label="Opacity"
                value={Math.round(state.effects.shadow.opacity * 100)}
                min={0}
                max={100}
                unit="%"
                onChange={(opacity) =>
                  updateEffects({
                    ...state.effects,
                    shadow: { ...state.effects.shadow, opacity: opacity / 100 },
                  })
                }
                disabled={!state.effects.shadow.enabled}
              />
            </div>

            <div className="space-y-3 rounded-lg border bg-background/20 p-3">
              <ToggleRow
                label="縁取り"
                checked={state.effects.stroke.enabled}
                onChange={(enabled) =>
                  updateEffects({
                    ...state.effects,
                    stroke: { ...state.effects.stroke, enabled },
                  })
                }
              />
              <ColorControl
                label="縁取り色"
                value={state.effects.stroke.color}
                onChange={(color) =>
                  updateEffects({
                    ...state.effects,
                    stroke: { ...state.effects.stroke, color },
                  })
                }
              />
              <RangeControl
                label="太さ"
                value={state.effects.stroke.width}
                min={0.5}
                max={12}
                step={0.5}
                unit="px"
                onChange={(width) =>
                  updateEffects({
                    ...state.effects,
                    stroke: { ...state.effects.stroke, width },
                  })
                }
                disabled={!state.effects.stroke.enabled}
              />
            </div>

            <div className="space-y-3 rounded-lg border bg-background/20 p-3">
              <ToggleRow
                label="グロー"
                checked={state.effects.glow.enabled}
                onChange={(enabled) =>
                  updateEffects({
                    ...state.effects,
                    glow: { ...state.effects.glow, enabled },
                  })
                }
              />
              <ColorControl
                label="グロー色"
                value={state.effects.glow.color}
                onChange={(color) =>
                  updateEffects({
                    ...state.effects,
                    glow: { ...state.effects.glow, color },
                  })
                }
              />
              <RangeControl
                label="強さ"
                value={state.effects.glow.blur}
                min={0}
                max={80}
                unit="px"
                onChange={(blur) =>
                  updateEffects({
                    ...state.effects,
                    glow: { ...state.effects.glow, blur },
                  })
                }
                disabled={!state.effects.glow.enabled}
              />
              <RangeControl
                label="Opacity"
                value={Math.round(state.effects.glow.opacity * 100)}
                min={0}
                max={100}
                unit="%"
                onChange={(opacity) =>
                  updateEffects({
                    ...state.effects,
                    glow: { ...state.effects.glow, opacity: opacity / 100 },
                  })
                }
                disabled={!state.effects.glow.enabled}
              />
            </div>
            <RangeControl
              label="文字ぼかし"
              value={state.effects.blur}
              min={0}
              max={8}
              step={0.2}
              unit="px"
              onChange={(blur) => updateEffects({ ...state.effects, blur })}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="background">
          <AccordionTrigger className="py-3.5 hover:no-underline">
            背景
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <div className="rounded-lg border border-dashed bg-background/25 p-3">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-md bg-primary/10 text-primary">
                  <ImagePlus className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-medium">
                    背景画像を読み込む
                  </span>
                  <span className="mt-0.5 block text-[9px] text-muted-foreground">
                    PNG / JPEG / WEBP · ローカル処理
                  </span>
                </span>
              </div>
              <Input
                id="background-file"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={fileChanged}
                aria-label="背景画像ファイル"
                className="mt-3 h-9 cursor-pointer bg-background/55 text-[10px] file:mr-2 file:text-[10px]"
              />
            </div>
            {background && (
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-background/25 px-3 py-2">
                <span className="min-w-0 truncate text-[10px] text-muted-foreground">
                  {background.name}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onRemoveBackground}
                >
                  <ImageOff /> 削除
                </Button>
              </div>
            )}
            <RangeControl
              label="背景暗転"
              value={state.backgroundDarkness}
              min={0}
              max={80}
              unit="%"
              onChange={(backgroundDarkness) => update({ backgroundDarkness })}
              disabled={!background}
            />
            <RangeControl
              label="背景ぼかし"
              value={state.backgroundBlur}
              min={0}
              max={20}
              unit="px"
              onChange={(backgroundBlur) => update({ backgroundBlur })}
              disabled={!background}
            />
            <p className="text-[9px] leading-relaxed text-muted-foreground">
              背景画像はブラウザ内だけで使用し、保存・送信しません。画像は中央にcover表示します。
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="canvas">
          <AccordionTrigger className="py-3.5 hover:no-underline">
            キャンバス
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <label htmlFor="canvas-size" className="block space-y-1.5">
              <span className="text-[11px] text-muted-foreground">
                出力サイズ
              </span>
              <NativeSelect
                id="canvas-size"
                value={
                  canvasPreset
                    ? `${canvasPreset[0]}x${canvasPreset[1]}`
                    : 'custom'
                }
                onChange={(event) => {
                  if (event.target.value === 'custom') return;
                  const [width, height] = event.target.value
                    .split('x')
                    .map(Number);
                  update({ canvas: { ...state.canvas, width, height } });
                }}
                className="w-full"
              >
                {canvasSizes.map(([width, height]) => (
                  <NativeSelectOption
                    key={`${width}x${height}`}
                    value={`${width}x${height}`}
                  >
                    {width} × {height}
                  </NativeSelectOption>
                ))}
                <NativeSelectOption value="custom">カスタム</NativeSelectOption>
              </NativeSelect>
            </label>
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
              <label htmlFor="canvas-width" className="space-y-1.5">
                <span className="text-[11px] text-muted-foreground">幅</span>
                <Input
                  id="canvas-width"
                  type="number"
                  min={320}
                  max={4096}
                  value={canvasDraftValue('width')}
                  onChange={(event) =>
                    setCanvasDraft((current) => ({
                      ...current,
                      width: {
                        value: event.target.value,
                        source: state.canvas.width,
                      },
                    }))
                  }
                  onBlur={() => commitCanvasDimension('width')}
                  onKeyDown={(event) => canvasDimensionKeyDown(event, 'width')}
                  className="bg-background/45 font-mono"
                />
              </label>
              <span className="pb-2 text-muted-foreground">×</span>
              <label htmlFor="canvas-height" className="space-y-1.5">
                <span className="text-[11px] text-muted-foreground">高さ</span>
                <Input
                  id="canvas-height"
                  type="number"
                  min={180}
                  max={4096}
                  value={canvasDraftValue('height')}
                  onChange={(event) =>
                    setCanvasDraft((current) => ({
                      ...current,
                      height: {
                        value: event.target.value,
                        source: state.canvas.height,
                      },
                    }))
                  }
                  onBlur={() => commitCanvasDimension('height')}
                  onKeyDown={(event) => canvasDimensionKeyDown(event, 'height')}
                  className="bg-background/45 font-mono"
                />
              </label>
            </div>
            <label htmlFor="safe-area" className="block space-y-1.5">
              <span className="text-[11px] text-muted-foreground">
                セーフエリアガイド
              </span>
              <NativeSelect
                id="safe-area"
                value={String(state.canvas.safeArea)}
                onChange={(event) =>
                  update({
                    canvas: {
                      ...state.canvas,
                      safeArea: Number(event.target.value) as 0 | 50 | 70,
                    },
                  })
                }
                className="w-full"
              >
                <NativeSelectOption value="0">表示しない</NativeSelectOption>
                <NativeSelectOption value="50">中央50%</NativeSelectOption>
                <NativeSelectOption value="70">中央70%</NativeSelectOption>
              </NativeSelect>
            </label>
            <ToggleRow
              label="横幅に収まるよう自動縮小"
              description="長いタイトルの文字サイズを自動調整"
              checked={state.canvas.autoFit}
              onChange={(autoFit) =>
                update({ canvas: { ...state.canvas, autoFit } })
              }
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="output">
          <AccordionTrigger className="py-3.5 hover:no-underline">
            出力
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-5">
            <ToggleRow
              label="透明部分を自動トリミング"
              description="タイトル部分PNGに適用"
              checked={state.autoTrim}
              onChange={(autoTrim) => update({ autoTrim })}
            />
            <label htmlFor="trim-padding" className="block space-y-1.5">
              <span className="text-[11px] text-muted-foreground">
                トリミング余白
              </span>
              <NativeSelect
                id="trim-padding"
                value={String(state.trimPadding)}
                onChange={(event) =>
                  update({
                    trimPadding: Number(event.target.value) as 32 | 64 | 128,
                  })
                }
                className="w-full"
                disabled={!state.autoTrim}
              >
                <NativeSelectOption value="32">32px</NativeSelectOption>
                <NativeSelectOption value="64">64px</NativeSelectOption>
                <NativeSelectOption value="128">128px</NativeSelectOption>
              </NativeSelect>
            </label>
            <div className="grid gap-2">
              <Button
                type="button"
                variant="outline"
                className="justify-start"
                disabled={exporting}
                onClick={() => onExport('transparent')}
              >
                <Download /> フル画面透過PNG
                <span className="ml-auto text-[9px] opacity-55">
                  {state.canvas.width}×{state.canvas.height}
                </span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="justify-start"
                disabled={exporting}
                onClick={() => onExport('trimmed')}
              >
                <Scissors /> タイトル部分PNG
                <span className="ml-auto text-[9px] opacity-55">素材用</span>
              </Button>
              <Button
                type="button"
                className="justify-start"
                disabled={exporting || !background}
                onClick={() => onExport('background')}
              >
                <ImagePlus /> 背景込みPNG
                <span className="ml-auto text-[9px] opacity-55">
                  {background ? '準備完了' : '背景未設定'}
                </span>
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
}
