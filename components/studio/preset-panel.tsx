'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Palette, Search, Star } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { PRESETS, applyPresetToState } from '@/src/data/presets';
import { renderTitleCard } from '@/src/editor/renderer';
import { cloneDefaultState } from '@/src/state/defaults';
import { PRESET_CATEGORIES, type AreaTitlePreset } from '@/src/types';

const FAVORITES_KEY = 'area-title-maker:favorites:v1';
const MAX_FAVORITES_LENGTH = 16 * 1024;
const PRESET_IDS = new Set(PRESETS.map((preset) => preset.id));

function normalizeFavorites(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value.filter(
        (id): id is string => typeof id === 'string' && PRESET_IDS.has(id),
      ),
    ),
  ].slice(0, PRESETS.length);
}

type PresetPanelProps = {
  selectedId: string;
  onApply: (preset: AreaTitlePreset) => void;
};

function needsLightBackdrop(color: string) {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return false;
  const value = Number.parseInt(color.slice(1), 16);
  const luminance =
    (((value >> 16) & 255) * 299 +
      ((value >> 8) & 255) * 587 +
      (value & 255) * 114) /
    1000;
  return luminance < 90;
}

function PresetThumbnail({
  preset,
  lightBackdrop,
}: {
  preset: AreaTitlePreset;
  lightBackdrop: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(false);
  const thumbnailState = useMemo(() => {
    const next = applyPresetToState(cloneDefaultState(), preset);
    return {
      ...next,
      canvas: { ...next.canvas, safeArea: 0 as const },
      position: { x: 0, y: 0 },
    };
  }, [preset]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    if (typeof IntersectionObserver === 'undefined') {
      const timer = window.setTimeout(() => setShouldRender(true), 0);
      return () => window.clearTimeout(timer);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setShouldRender(true);
        observer.disconnect();
      },
      { rootMargin: '160px' },
    );
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldRender) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderTitleCard(canvas, thumbnailState, {
      bitmapScale: 0.18,
      drawGuide: false,
    });
  }, [shouldRender, thumbnailState]);

  return (
    <div
      ref={frameRef}
      className="aspect-video overflow-hidden"
      style={{
        background: lightBackdrop
          ? 'linear-gradient(145deg, #f2efe8, #d8d3c9)'
          : 'radial-gradient(circle at 50% 15%, #272824, #111210 72%)',
      }}
    >
      <canvas ref={canvasRef} aria-hidden="true" className="block size-full" />
    </div>
  );
}

export function PresetPanel({ selectedId, onApply }: PresetPanelProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(FAVORITES_KEY);
        if (!stored) return;
        if (stored.length > MAX_FAVORITES_LENGTH) {
          window.localStorage.removeItem(FAVORITES_KEY);
          return;
        }
        const next = normalizeFavorites(JSON.parse(stored) as unknown);
        setFavorites(next);
        window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      } catch {
        // Favorites are optional when browser storage is blocked.
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return PRESETS.filter((preset) => {
      const matchesCategory =
        category === 'All' || preset.category === category;
      const matchesFavorite = !favoritesOnly || favorites.includes(preset.id);
      const haystack =
        `${preset.name} ${preset.category} ${preset.mainText} ${preset.subText}`.toLocaleLowerCase();
      return (
        matchesCategory && matchesFavorite && (!term || haystack.includes(term))
      );
    });
  }, [category, favorites, favoritesOnly, query]);

  const toggleFavorite = (id: string) => {
    const next = normalizeFavorites(
      favorites.includes(id)
        ? favorites.filter((favorite) => favorite !== id)
        : [...favorites, id],
    );
    setFavorites(next);
    try {
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    } catch {
      // Keep the current-session favorite state.
    }
  };

  return (
    <section
      aria-labelledby="preset-heading"
      className="flex h-full min-h-0 flex-1 flex-col"
    >
      <div className="space-y-3 border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Palette className="size-3.5 text-primary" />
              <h2 id="preset-heading" className="text-sm font-semibold">
                プリセット
              </h2>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              50種から雰囲気を選択
            </p>
          </div>
          <span className="rounded-md border bg-background/40 px-2 py-1 font-mono text-[10px] text-muted-foreground">
            {filtered.length} / 50
          </span>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="プリセットを検索"
            aria-label="プリセットを検索"
            className="h-9 bg-background/55 pl-8"
          />
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <NativeSelect
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            aria-label="カテゴリで絞り込む"
            className="w-full"
          >
            <NativeSelectOption value="All">
              すべてのカテゴリ
            </NativeSelectOption>
            {PRESET_CATEGORIES.map((item) => (
              <NativeSelectOption key={item} value={item}>
                {item}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <Button
            type="button"
            variant={favoritesOnly ? 'secondary' : 'outline'}
            size="icon"
            aria-label="お気に入りだけ表示"
            aria-pressed={favoritesOnly}
            onClick={() => setFavoritesOnly((value) => !value)}
          >
            <Star
              className={favoritesOnly ? 'fill-primary text-primary' : ''}
            />
          </Button>
        </div>
      </div>

      <section
        aria-label="プリセット一覧"
        className="min-h-0 flex-1 overflow-visible overscroll-auto p-3 scrollbar-gutter-stable scrollbar-thin lg:touch-pan-y lg:overflow-y-auto lg:overscroll-contain"
      >
        {filtered.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {filtered.map((preset) => {
              const favorite = favorites.includes(preset.id);
              const selected = selectedId === preset.id;
              const lightBackdrop =
                needsLightBackdrop(preset.mainTextStyle.color) ||
                needsLightBackdrop(preset.subTextStyle.color);
              return (
                <div
                  key={preset.id}
                  className={`group relative overflow-hidden rounded-lg border transition ${
                    selected
                      ? 'border-primary/70 bg-primary/[.08] shadow-[0_0_0_1px_rgba(214,181,110,.15)]'
                      : 'border-border bg-background/35 hover:border-primary/30'
                  }`}
                >
                  <button
                    type="button"
                    aria-pressed={selected}
                    aria-label={`${preset.name}プリセットを適用`}
                    onClick={() => onApply(preset)}
                    className="block w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                  >
                    <PresetThumbnail
                      preset={preset}
                      lightBackdrop={lightBackdrop}
                    />
                    <div className="border-t px-2 py-2 pr-9">
                      <span className="block truncate text-[9px] font-medium">
                        {preset.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[8px] text-muted-foreground">
                        {preset.category}
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    aria-label={`${preset.name}を${favorite ? 'お気に入りから外す' : 'お気に入りに追加'}`}
                    aria-pressed={favorite}
                    onClick={() => toggleFavorite(preset.id)}
                    className={`absolute bottom-1 right-1 grid size-6 place-items-center rounded-md bg-background/80 text-muted-foreground opacity-100 outline-none transition hover:text-primary focus-visible:ring-2 focus-visible:ring-primary lg:focus:opacity-100 ${
                      favorite
                        ? 'lg:opacity-100'
                        : 'lg:opacity-0 lg:group-hover:opacity-100'
                    }`}
                  >
                    <Star
                      className={`size-3 ${favorite ? 'fill-primary text-primary' : ''}`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid min-h-56 place-items-center rounded-lg border border-dashed text-center">
            <div>
              <Search className="mx-auto mb-2 size-5 text-muted-foreground" />
              <p className="text-xs">一致するプリセットがありません</p>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setCategory('All');
                  setFavoritesOnly(false);
                }}
                className="mt-2 text-[11px] text-primary hover:underline"
              >
                絞り込みを解除
              </button>
            </div>
          </div>
        )}
      </section>
    </section>
  );
}
