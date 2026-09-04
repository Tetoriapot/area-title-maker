import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_FONT_FAMILIES,
  EDITOR_FONT_WEIGHTS,
  FONT_OPTIONS,
  findFontOption,
  nearestSupportedFontWeight,
} from '../src/data/fonts.ts';
import {
  buildFontDescriptor,
  buildGoogleFontsStylesheetUrl,
  createGoogleFontLoader,
  normalizeFontText,
} from '../src/editor/font-loader-core.mjs';

const notoSerif = {
  family: 'Noto Serif JP',
  weight: 600,
  italic: false,
  text: '忘れられた王都',
};

function createHarness({
  failLink = false,
  initialCheck = true,
  loadResults = null,
} = {}) {
  const links = [];
  const elements = new Map();
  const fontLoads = [];
  let checkResult = initialCheck;
  let checks = 0;

  const document = {
    fonts: {
      async load(descriptor, text) {
        fontLoads.push({ descriptor, text });
        return loadResults?.[fontLoads.length - 1] ?? [{}];
      },
      check(descriptor, text) {
        checks += 1;
        return typeof checkResult === 'function'
          ? checkResult(descriptor, text)
          : checkResult;
      },
    },
    head: {
      appendChild(link) {
        links.push(link);
        elements.set(link.id, link);
        queueMicrotask(() => {
          if (failLink) link.onerror?.();
          else link.onload?.();
        });
      },
    },
    createElement(tagName) {
      assert.equal(tagName, 'link');
      const link = {
        dataset: {},
        id: '',
        rel: '',
        href: '',
        referrerPolicy: '',
        sheet: null,
        onload: null,
        onerror: null,
        remove() {
          elements.delete(link.id);
        },
      };
      return link;
    },
    getElementById(id) {
      return elements.get(id) ?? null;
    },
  };

  return {
    document,
    fontLoads,
    links,
    loader: createGoogleFontLoader({ document, timeoutMs: 1000 }),
    checkCalls() {
      return checks;
    },
    setCheckResult(value) {
      checkResult = value;
    },
  };
}

test('the curated catalog contains eight valid Google Fonts', () => {
  const googleFonts = FONT_OPTIONS.filter((font) => font.source === 'google');
  assert.equal(googleFonts.length, 8);
  assert.equal(new Set(googleFonts.map((font) => font.id)).size, 8);
  assert.equal(new Set(googleFonts.map((font) => font.value)).size, 8);
  assert.equal(new Set(googleFonts.map((font) => font.googleFamily)).size, 8);

  for (const font of googleFonts) {
    assert.ok(font.googleFamily);
    assert.ok(font.weights.length > 0);
    assert.ok(
      font.weights.every((weight) => EDITOR_FONT_WEIGHTS.includes(weight)),
    );
  }

  const cormorant = googleFonts.find(
    (font) => font.googleFamily === 'Cormorant Garamond',
  );
  assert.equal(cormorant?.italic, true);
  assert.ok(
    googleFonts
      .filter((font) => font !== cormorant)
      .every((font) => !font.italic),
  );
});

test('the default state uses only local fonts', () => {
  assert.equal(findFontOption(DEFAULT_FONT_FAMILIES.main)?.source, 'system');
  assert.equal(findFontOption(DEFAULT_FONT_FAMILIES.sub)?.source, 'system');
});

test('unsupported weights are normalized to the nearest available value', () => {
  const rajdhani = FONT_OPTIONS.find(
    (font) => font.googleFamily === 'Rajdhani',
  );
  const zen = FONT_OPTIONS.find(
    (font) => font.googleFamily === 'Zen Old Mincho',
  );
  assert.equal(nearestSupportedFontWeight(rajdhani, 900), 700);
  assert.equal(nearestSupportedFontWeight(zen, 800), 700);
});

test('the catalog distinguishes Japanese and Latin display fonts', () => {
  const cinzel = FONT_OPTIONS.find((font) => font.googleFamily === 'Cinzel');
  assert.ok(cinzel);
  assert.equal(cinzel.supportsJapanese, false);

  const noto = FONT_OPTIONS.find(
    (font) => font.googleFamily === 'Noto Serif JP',
  );
  assert.ok(noto);
  assert.equal(noto.supportsJapanese, true);
});

test('font verification keeps spaces because they affect Canvas metrics', () => {
  const normalized = normalizeFontText('王 都　王');
  assert.ok(normalized.includes(' '));
  assert.ok(normalized.includes('　'));
  assert.ok(normalized.includes('王'));
  assert.ok(normalized.includes('都'));
});

test('the CSS request contains only the selected face and never title text', () => {
  const url = buildGoogleFontsStylesheetUrl(notoSerif);
  assert.equal(
    url,
    'https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@600&display=swap',
  );
  assert.doesNotMatch(url, /text=/i);
  assert.doesNotMatch(url, /忘れられた王都/);
  assert.equal(
    buildFontDescriptor(notoSerif),
    'normal 600 16px "Noto Serif JP"',
  );

  assert.equal(
    buildGoogleFontsStylesheetUrl({
      family: 'Cormorant Garamond',
      weight: 500,
      italic: true,
      text: 'Forgotten Capital',
    }),
    'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,500&display=swap',
  );
});

test('duplicate requests share one stylesheet and one FontFaceSet load', async () => {
  const harness = createHarness();
  await Promise.all([
    harness.loader.load(notoSerif),
    harness.loader.load({ ...notoSerif }),
  ]);

  assert.equal(harness.links.length, 1);
  assert.equal(harness.fontLoads.length, 1);
  assert.equal(harness.links[0].rel, 'stylesheet');
  assert.equal(harness.links[0].referrerPolicy, 'no-referrer');
  assert.equal(harness.fontLoads[0].text, normalizeFontText(notoSerif.text));
});

test('unsupported glyphs may fall back after the selected face is verified', async () => {
  const harness = createHarness({ loadResults: [[], [{}]] });
  await harness.loader.load({
    family: 'Orbitron',
    weight: 400,
    italic: false,
    text: '忘れられた王都！Ā😀',
  });

  assert.equal(harness.links.length, 1);
  assert.deepEqual(
    harness.fontLoads.map(({ text }) => text),
    [normalizeFontText('忘れられた王都！Ā😀'), 'A'],
  );
});

test('a loaded Japanese subset does not require the Latin probe', async () => {
  const harness = createHarness({
    initialCheck(_descriptor, text) {
      return text !== 'A';
    },
  });

  await harness.loader.load(notoSerif);

  assert.deepEqual(
    harness.fontLoads.map(({ text }) => text),
    [normalizeFontText(notoSerif.text)],
  );
});

test('forced verification rechecks a cached face before export', async () => {
  const harness = createHarness();
  await harness.loader.load(notoSerif);
  const checksAfterLoad = harness.checkCalls();

  await harness.loader.load(notoSerif, { forceCheck: true });

  assert.equal(harness.links.length, 1);
  assert.equal(harness.fontLoads.length, 2);
  assert.equal(harness.checkCalls(), checksAfterLoad + 1);
});

test('new characters recheck glyphs without adding another stylesheet', async () => {
  const harness = createHarness();
  await harness.loader.load({ ...notoSerif, text: '王' });
  await harness.loader.load({ ...notoSerif, text: '都' });

  assert.equal(harness.links.length, 1);
  assert.equal(harness.fontLoads.length, 2);
});

test('a failed verification is not cached and can be retried', async () => {
  const harness = createHarness({ initialCheck: false });
  await assert.rejects(
    harness.loader.load(notoSerif),
    /Font verification failed/,
  );

  harness.setCheckResult(true);
  await harness.loader.load(notoSerif);

  assert.equal(harness.links.length, 1);
  assert.equal(harness.fontLoads.length, 2);
});

test('a stylesheet failure prevents font verification', async () => {
  const harness = createHarness({ failLink: true });
  await assert.rejects(harness.loader.load(notoSerif), /Stylesheet failed/);
  assert.equal(harness.fontLoads.length, 0);
});
