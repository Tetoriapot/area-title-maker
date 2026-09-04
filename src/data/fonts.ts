export const EDITOR_FONT_WEIGHTS = [300, 400, 500, 600, 700, 800, 900] as const;

export type EditorFontWeight = (typeof EDITOR_FONT_WEIGHTS)[number];
export type FontCategory = 'google-japanese' | 'google-latin' | 'system';

export type FontOption = {
  id: string;
  label: string;
  value: string;
  source: 'google' | 'system';
  category: FontCategory;
  weights: readonly EditorFontWeight[];
  italic: boolean;
  supportsJapanese: boolean;
  googleFamily?: string;
};

export const SYSTEM_FONT_STACKS = {
  mincho: '"Yu Mincho", "Hiragino Mincho ProN", serif',
  gothic: '"Yu Gothic", "Hiragino Kaku Gothic ProN", sans-serif',
  serif: 'serif',
  sans: 'sans-serif',
  roman: 'Georgia, "Times New Roman", serif',
  times: '"Times New Roman", Times, serif',
  arial: 'Arial, Verdana, sans-serif',
  verdana: 'Verdana, Arial, sans-serif',
  trebuchet: '"Trebuchet MS", Arial, sans-serif',
  courier: '"Courier New", monospace',
  japaneseMono: '"Courier New", "Yu Gothic", monospace',
  msGothicMono: '"MS Gothic", "Yu Gothic", monospace',
} as const;

export const DEFAULT_FONT_FAMILIES = {
  main: SYSTEM_FONT_STACKS.mincho,
  sub: SYSTEM_FONT_STACKS.roman,
} as const;

const googleFont = (
  option: Omit<FontOption, 'source' | 'category'> & {
    category: Exclude<FontCategory, 'system'>;
    googleFamily: string;
  },
): FontOption => ({ ...option, source: 'google' });

const systemFont = (
  option: Omit<
    FontOption,
    'source' | 'category' | 'weights' | 'italic' | 'supportsJapanese'
  > &
    Partial<Pick<FontOption, 'weights' | 'italic' | 'supportsJapanese'>>,
): FontOption => ({
  ...option,
  source: 'system',
  category: 'system',
  weights: option.weights ?? EDITOR_FONT_WEIGHTS,
  italic: option.italic ?? true,
  supportsJapanese: option.supportsJapanese ?? true,
});

export const FONT_OPTIONS: readonly FontOption[] = [
  googleFont({
    id: 'noto-serif-jp',
    label: 'Noto Serif JP（日本語）',
    value: `"Noto Serif JP", ${SYSTEM_FONT_STACKS.mincho}`,
    googleFamily: 'Noto Serif JP',
    category: 'google-japanese',
    weights: [300, 400, 500, 600, 700, 800, 900],
    italic: false,
    supportsJapanese: true,
  }),
  googleFont({
    id: 'shippori-mincho',
    label: 'Shippori Mincho（日本語）',
    value: `"Shippori Mincho", ${SYSTEM_FONT_STACKS.mincho}`,
    googleFamily: 'Shippori Mincho',
    category: 'google-japanese',
    weights: [400, 500, 600, 700, 800],
    italic: false,
    supportsJapanese: true,
  }),
  googleFont({
    id: 'zen-old-mincho',
    label: 'Zen Old Mincho（日本語）',
    value: `"Zen Old Mincho", ${SYSTEM_FONT_STACKS.mincho}`,
    googleFamily: 'Zen Old Mincho',
    category: 'google-japanese',
    weights: [400, 500, 600, 700, 900],
    italic: false,
    supportsJapanese: true,
  }),
  googleFont({
    id: 'noto-sans-jp',
    label: 'Noto Sans JP（日本語）',
    value: `"Noto Sans JP", ${SYSTEM_FONT_STACKS.gothic}`,
    googleFamily: 'Noto Sans JP',
    category: 'google-japanese',
    weights: [300, 400, 500, 600, 700, 800, 900],
    italic: false,
    supportsJapanese: true,
  }),
  googleFont({
    id: 'cinzel',
    label: 'Cinzel（英字向け）',
    value: `"Cinzel", ${SYSTEM_FONT_STACKS.roman}`,
    googleFamily: 'Cinzel',
    category: 'google-latin',
    weights: [400, 500, 600, 700, 800, 900],
    italic: false,
    supportsJapanese: false,
  }),
  googleFont({
    id: 'cormorant-garamond',
    label: 'Cormorant Garamond（英字向け）',
    value: `"Cormorant Garamond", ${SYSTEM_FONT_STACKS.roman}`,
    googleFamily: 'Cormorant Garamond',
    category: 'google-latin',
    weights: [300, 400, 500, 600, 700],
    italic: true,
    supportsJapanese: false,
  }),
  googleFont({
    id: 'orbitron',
    label: 'Orbitron（英字向け）',
    value: `"Orbitron", ${SYSTEM_FONT_STACKS.arial}`,
    googleFamily: 'Orbitron',
    category: 'google-latin',
    weights: [400, 500, 600, 700, 800, 900],
    italic: false,
    supportsJapanese: false,
  }),
  googleFont({
    id: 'rajdhani',
    label: 'Rajdhani（英字向け）',
    value: `"Rajdhani", ${SYSTEM_FONT_STACKS.arial}`,
    googleFamily: 'Rajdhani',
    category: 'google-latin',
    weights: [300, 400, 500, 600, 700],
    italic: false,
    supportsJapanese: false,
  }),
  systemFont({
    id: 'system-mincho',
    label: '明朝（端末内）',
    value: SYSTEM_FONT_STACKS.mincho,
  }),
  systemFont({
    id: 'system-gothic',
    label: 'ゴシック（端末内）',
    value: SYSTEM_FONT_STACKS.gothic,
  }),
  systemFont({ id: 'serif', label: 'Serif', value: SYSTEM_FONT_STACKS.serif }),
  systemFont({
    id: 'sans-serif',
    label: 'Sans Serif',
    value: SYSTEM_FONT_STACKS.sans,
  }),
  systemFont({
    id: 'georgia',
    label: 'Georgia',
    value: SYSTEM_FONT_STACKS.roman,
  }),
  systemFont({
    id: 'times-new-roman',
    label: 'Times New Roman',
    value: SYSTEM_FONT_STACKS.times,
  }),
  systemFont({ id: 'arial', label: 'Arial', value: SYSTEM_FONT_STACKS.arial }),
  systemFont({
    id: 'verdana',
    label: 'Verdana',
    value: SYSTEM_FONT_STACKS.verdana,
  }),
  systemFont({
    id: 'trebuchet-ms',
    label: 'Trebuchet MS',
    value: SYSTEM_FONT_STACKS.trebuchet,
  }),
  systemFont({
    id: 'courier-new',
    label: 'Courier New',
    value: SYSTEM_FONT_STACKS.courier,
  }),
  systemFont({
    id: 'japanese-mono',
    label: '等幅（和文補助）',
    value: SYSTEM_FONT_STACKS.japaneseMono,
  }),
  systemFont({
    id: 'ms-gothic-mono',
    label: 'MS ゴシック等幅',
    value: SYSTEM_FONT_STACKS.msGothicMono,
  }),
];

const FONT_OPTION_BY_VALUE = new Map(
  FONT_OPTIONS.map((option) => [option.value, option] as const),
);

export const VALID_FONT_FAMILIES: readonly string[] = FONT_OPTIONS.map(
  (option) => option.value,
);

export function findFontOption(fontFamily: string) {
  return FONT_OPTION_BY_VALUE.get(fontFamily);
}

export function nearestSupportedFontWeight(
  font: FontOption | undefined,
  requestedWeight: number,
): EditorFontWeight {
  const weights = font?.weights ?? EDITOR_FONT_WEIGHTS;
  return weights.reduce((nearest, weight) =>
    Math.abs(weight - requestedWeight) < Math.abs(nearest - requestedWeight)
      ? weight
      : nearest,
  );
}
