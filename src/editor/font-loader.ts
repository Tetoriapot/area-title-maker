import { findFontOption, nearestSupportedFontWeight } from '@/src/data/fonts';
import {
  createGoogleFontLoader,
  fontRequestKey,
} from '@/src/editor/font-loader-core.mjs';
import type { EditorState, TextStyle } from '@/src/types';

type GoogleFontFaceRequest = {
  family: string;
  weight: number;
  italic: boolean;
  text: string;
};

const browserFontLoader = createGoogleFontLoader();

function requestForStyle(
  style: TextStyle,
  text: string,
): GoogleFontFaceRequest | null {
  const option = findFontOption(style.fontFamily);
  if (option?.source !== 'google' || !option.googleFamily || !text) {
    return null;
  }

  return {
    family: option.googleFamily,
    weight: nearestSupportedFontWeight(option, style.weight),
    italic: option.italic && style.italic,
    text,
  };
}

export function getEditorFontRequests(state: EditorState) {
  return [
    requestForStyle(state.mainTextStyle, state.mainText),
    requestForStyle(state.subTextStyle, state.subText),
  ].filter((request): request is GoogleFontFaceRequest => Boolean(request));
}

export function editorUsesGoogleFonts(state: EditorState) {
  return [state.mainTextStyle, state.subTextStyle].some(
    (style) => findFontOption(style.fontFamily)?.source === 'google',
  );
}

export function editorFontRequirementKey(state: EditorState) {
  const keys = getEditorFontRequests(state)
    .map((request) => fontRequestKey(request))
    .sort((left, right) => left.localeCompare(right));
  return keys.length ? keys.join('\u0001') : 'system-fonts';
}

export function areEditorFontsReady(state: EditorState) {
  return getEditorFontRequests(state).every((request) =>
    browserFontLoader.isLoaded(request),
  );
}

export async function loadEditorFonts(
  state: EditorState,
  options: { forceCheck?: boolean } = {},
) {
  const requests = getEditorFontRequests(state);
  if (requests.length === 0) return;

  try {
    await Promise.all(
      requests.map((request) => browserFontLoader.load(request, options)),
    );
  } catch (error) {
    const families = [...new Set(requests.map((request) => request.family))];
    throw new Error(
      `Google Fonts「${families.join('／')}」を読み込めませんでした。通信を確認して、もう一度お試しください。`,
      { cause: error },
    );
  }
}
