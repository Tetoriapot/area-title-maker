'use client';

import { useEffect, useMemo, useState } from 'react';
import { Palette, Search, Star } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { PRESETS } from '@/src/data/presets';
import { PRESET_CATEGORIES, type AreaTitlePreset } from '@/src/types';

const FAVORITES_KEY = 'area-title-maker:favorites:v1';

type PresetPanelProps = {
  selectedId: string;
  onApply: (preset: AreaTitlePreset) => void;
};

function needsLightBackdrop(color: string) {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return false;
  const value = Number.parseInt(color.slice(1), 16);
  const luminance =
    (((value >> 16) & 255) * 299 + ((value >> 8) & 255) * 587 + (value & 255) * 114) /
    1000;
  return luminance < 90;
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
        if (stored) setFavorites(JSON.parse(stored) as string[]);
      } catch {
        // Favorites are optional when browser storage is blocked.
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return PRESETS.filter((preset) => {
      const matchesCategory = category === 'All' || preset.category === category;
      const matchesFavorite = !favoritesOnly || favorites.includes(preset.id);
      const haystack = `${preset.name} ${preset.category} ${preset.mainText} ${preset.subText}`.toLocaleLowerCase();
      return matchesCategory && matchesFavorite && (!term || haystack.includes(term));
    });
  }, [category, favorites, favoritesOnly, query]);

  const toggleFavorite = (id: string) => {
    const next = favorites.includes(id)
      ? favorites.filter((favorite) => favorite !== id)
      : [...favorites, id];
    setFavorites(next);
    try {
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    } catch {
      // Keep the current-session favorite state.
    }
  };

  return (
    <section aria-labelledby="preset-heading" className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-3 border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Palette className="size-3.5 text-primary" />
              <h2 id="preset-heading" className="text-sm font-semibold">プリセット</h2>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">50種から雰囲気を選択</p>
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
            <NativeSelectOption value="All">すべてのカテゴリ</NativeSelectOption>
            {PRESET_CATEGORIES.map((item) => (
              <NativeSelectOption key={item} value={item}>{item}</NativeSelectOption>
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
            <Star className={favoritesOnly ? 'fill-primary text-primary' : ''} />
          </Button>
        </div>
      </div>

      <div className="min-h-[360px] flex-1 overflow-y-auto p-3">
        {filtered.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {filtered.map((preset) => {
              const favorite = favorites.includes(preset.id);
              const selected = selectedId === preset.id;
              const lightBackdrop = needsLightBackdrop(preset.mainTextStyle.color);
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
                    <div
                      className="flex aspect-[1.5] flex-col items-center justify-center overflow-hidden px-1"
                      style={{
                        background: lightBackdrop
                          ? 'linear-gradient(145deg, #f2efe8, #d8d3c9)'
                          : 'radial-gradient(circle at 50% 15%, #272824, #111210 72%)',
                      }}
                    >
                      <span
                        className="max-w-full truncate text-[10px] leading-none"
                        style={{
                          color: preset.mainTextStyle.color,
                          fontFamily: preset.mainTextStyle.fontFamily,
                          fontWeight: preset.mainTextStyle.weight,
                          letterSpacing: `${Math.min(2.5, preset.mainTextStyle.letterSpacing / 6)}px`,
                        }}
                      >
                        {preset.mainText}
                      </span>
                      {preset.decoration.lineStyle !== 'none' && (
                        <span className="my-1 flex w-[76%] items-center gap-1" style={{ color: preset.decoration.color }}>
                          <span className="h-px flex-1 bg-current opacity-70" />
                          <span className="text-[8px]">{preset.decoration.symbol}</span>
                          <span className="h-px flex-1 bg-current opacity-70" />
                        </span>
                      )}
                      {preset.subText && (
                        <span
                          className="max-w-full truncate text-[6px] leading-none opacity-80"
                          style={{
                            color: preset.subTextStyle.color,
                            fontFamily: preset.subTextStyle.fontFamily,
                            letterSpacing: '.4px',
                          }}
                        >
                          {preset.subText}
                        </span>
                      )}
                    </div>
                    <div className="border-t px-2 py-2">
                      <span className="block truncate text-[9px] font-medium">{preset.name}</span>
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
                    className="absolute right-1 top-1 grid size-6 place-items-center rounded-md bg-black/45 text-white/70 opacity-100 outline-none transition hover:text-primary focus-visible:ring-2 focus-visible:ring-primary lg:opacity-0 lg:group-hover:opacity-100 lg:focus:opacity-100"
                  >
                    <Star className={`size-3 ${favorite ? 'fill-primary text-primary' : ''}`} />
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
      </div>
    </section>
  );
}
