const GOOGLE_FONTS_CSS_BASE = 'https://fonts.googleapis.com/css2';
const DEFAULT_TIMEOUT_MS = 15_000;
const FONT_EXISTENCE_PROBE = 'A';

function assertFace(face) {
  if (!/^[a-z0-9 ]+$/i.test(face.family)) {
    throw new Error('Invalid Google Fonts family.');
  }
  if (
    !Number.isInteger(face.weight) ||
    face.weight < 100 ||
    face.weight > 900
  ) {
    throw new Error('Invalid Google Fonts weight.');
  }
}

export function normalizeFontText(text) {
  return [...new Set(Array.from(text))]
    .sort(
      (left, right) => (left.codePointAt(0) ?? 0) - (right.codePointAt(0) ?? 0),
    )
    .join('');
}

export function fontFaceKey(face) {
  assertFace(face);
  return `${face.family}\u0000${face.weight}\u0000${face.italic ? 'italic' : 'normal'}`;
}

export function fontRequestKey(face) {
  return `${fontFaceKey(face)}\u0000${normalizeFontText(face.text)}`;
}

export function buildGoogleFontsStylesheetUrl(face) {
  assertFace(face);
  const family = encodeURIComponent(face.family.trim()).replaceAll('%20', '+');
  const variant = face.italic
    ? `:ital,wght@1,${face.weight}`
    : `:wght@${face.weight}`;
  return `${GOOGLE_FONTS_CSS_BASE}?family=${family}${variant}&display=swap`;
}

export function buildFontDescriptor(face) {
  assertFace(face);
  const family = face.family.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
  return `${face.italic ? 'italic' : 'normal'} ${face.weight} 16px "${family}"`;
}

function stylesheetId(face) {
  const family = face.family
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `area-title-font-${family}-${face.weight}-${face.italic ? 'italic' : 'normal'}`;
}

/**
 * Create a loader whose environment can be replaced by tests. The default
 * document is resolved only when load() runs, so importing this module during
 * server rendering does not touch browser globals.
 */
export function createGoogleFontLoader(options = {}) {
  const stylesheetPromises = new Map();
  const requestPromises = new Map();
  const loadedCharacters = new Map();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const setTimer = options.setTimeout ?? globalThis.setTimeout;
  const clearTimer = options.clearTimeout ?? globalThis.clearTimeout;

  function getDocument() {
    const documentRef = options.document ?? globalThis.document;
    if (
      !documentRef?.head ||
      typeof documentRef.createElement !== 'function' ||
      typeof documentRef.fonts?.load !== 'function' ||
      typeof documentRef.fonts?.check !== 'function'
    ) {
      throw new Error('This browser cannot verify web fonts.');
    }
    return documentRef;
  }

  function waitForStylesheet(documentRef, face) {
    const key = fontFaceKey(face);
    const id = stylesheetId(face);
    let existing = documentRef.getElementById?.(id);
    if (existing?.disabled) {
      existing.remove?.();
      existing = null;
      stylesheetPromises.delete(key);
    }
    const cached = stylesheetPromises.get(key);
    if (cached && existing) return cached;
    if (cached) stylesheetPromises.delete(key);

    if (existing?.dataset?.areaTitleFontLoaded === 'true' || existing?.sheet) {
      if (existing.dataset) existing.dataset.areaTitleFontLoaded = 'true';
      const ready = Promise.resolve();
      stylesheetPromises.set(key, ready);
      return ready;
    }

    const link = existing ?? documentRef.createElement('link');
    if (!existing) {
      link.id = id;
      link.rel = 'stylesheet';
      link.href = buildGoogleFontsStylesheetUrl(face);
      link.referrerPolicy = 'no-referrer';
      if (link.dataset) link.dataset.areaTitleFont = 'true';
    }

    const request = new Promise((resolve, reject) => {
      let settled = false;
      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        clearTimer(timer);
        link.onload = null;
        link.onerror = null;
        callback(value);
      };
      const timer = setTimer(() => {
        link.remove?.();
        finish(reject, new Error(`Stylesheet timed out: ${face.family}`));
      }, timeoutMs);

      link.onload = () => {
        if (link.dataset) link.dataset.areaTitleFontLoaded = 'true';
        finish(resolve);
      };
      link.onerror = () => {
        link.remove?.();
        finish(reject, new Error(`Stylesheet failed: ${face.family}`));
      };

      if (!existing) documentRef.head.appendChild(link);
    }).catch((error) => {
      stylesheetPromises.delete(key);
      throw error;
    });

    stylesheetPromises.set(key, request);
    return request;
  }

  function withTimeout(promise, label) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        clearTimer(timer);
        callback(value);
      };
      const timer = setTimer(
        () => finish(reject, new Error(`${label} timed out.`)),
        timeoutMs,
      );
      promise.then(
        (value) => finish(resolve, value),
        (error) => finish(reject, error),
      );
    });
  }

  function hasLoadedCharacters(face, text) {
    const characters = loadedCharacters.get(fontFaceKey(face));
    return Boolean(
      characters &&
      Array.from(text).every((character) => characters.has(character)),
    );
  }

  async function load(face, loadOptions = {}) {
    const text = normalizeFontText(face.text);
    if (!text) return;

    const normalizedFace = { ...face, text };
    const key = fontRequestKey(normalizedFace);
    const faceKey = fontFaceKey(normalizedFace);
    if (hasLoadedCharacters(normalizedFace, text) && !loadOptions.forceCheck)
      return;

    const cached = requestPromises.get(key);
    if (cached) return cached;

    const request = (async () => {
      const documentRef = getDocument();
      await waitForStylesheet(documentRef, normalizedFace);
      const descriptor = buildFontDescriptor(normalizedFace);
      let verificationText = text;
      let loadedFaces = await withTimeout(
        Promise.resolve(documentRef.fonts.load(descriptor, text)),
        `Font ${normalizedFace.family}`,
      );
      if (!loadedFaces?.length) {
        verificationText = FONT_EXISTENCE_PROBE;
        loadedFaces = await withTimeout(
          Promise.resolve(
            documentRef.fonts.load(descriptor, FONT_EXISTENCE_PROBE),
          ),
          `Font ${normalizedFace.family}`,
        );
      }
      const textIsReady = documentRef.fonts.check(descriptor, text);
      const faceIsReady =
        verificationText === text ||
        documentRef.fonts.check(descriptor, verificationText);
      if (!loadedFaces?.length || !textIsReady || !faceIsReady) {
        throw new Error(`Font verification failed: ${normalizedFace.family}`);
      }
      const characters = loadedCharacters.get(faceKey) ?? new Set();
      for (const character of text) characters.add(character);
      loadedCharacters.set(faceKey, characters);
    })();

    requestPromises.set(key, request);
    try {
      await request;
    } finally {
      if (requestPromises.get(key) === request) requestPromises.delete(key);
    }
  }

  return {
    isLoaded(face) {
      const text = normalizeFontText(face.text);
      return !text || hasLoadedCharacters(face, text);
    },
    load,
  };
}
