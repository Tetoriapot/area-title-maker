import { loadEditorFonts } from '@/src/editor/font-loader';
import { renderTitleCard } from '@/src/editor/renderer';
import type { EditorState } from '@/src/types';

export type ExportMode = 'transparent' | 'trimmed' | 'background';

function getAlphaBounds(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const pixels = context.getImageData(0, 0, width, height).data;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3] > 2) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  return maxX < minX || maxY < minY ? null : { minX, minY, maxX, maxY };
}

function canvasBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('PNGの生成に失敗しました。'));
    }, 'image/png');
  });
}

function safeFileName(text: string) {
  const normalized = text
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '_')
    .slice(0, 48);
  return normalized || 'area-title';
}

export async function exportTitleCard(
  state: EditorState,
  mode: ExportMode,
  backgroundImage?: CanvasImageSource | null,
) {
  await loadEditorFonts(state, { forceCheck: true });

  const source = document.createElement('canvas');
  renderTitleCard(source, state, {
    backgroundImage,
    includeBackground: mode === 'background',
    drawGuide: false,
    bitmapScale: 1,
  });

  let output = source;
  if (mode === 'trimmed' && state.autoTrim) {
    const sourceContext = source.getContext('2d', { willReadFrequently: true });
    const bounds = sourceContext
      ? getAlphaBounds(sourceContext, source.width, source.height)
      : null;
    if (bounds) {
      const padding = state.trimPadding;
      const cropX = Math.max(0, bounds.minX - padding);
      const cropY = Math.max(0, bounds.minY - padding);
      const cropRight = Math.min(source.width, bounds.maxX + padding + 1);
      const cropBottom = Math.min(source.height, bounds.maxY + padding + 1);
      output = document.createElement('canvas');
      output.width = Math.max(1, cropRight - cropX);
      output.height = Math.max(1, cropBottom - cropY);
      output
        .getContext('2d')
        ?.drawImage(
          source,
          cropX,
          cropY,
          output.width,
          output.height,
          0,
          0,
          output.width,
          output.height,
        );
    }
  }

  const blob = await canvasBlob(output);
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const suffix =
    mode === 'background'
      ? 'background'
      : mode === 'trimmed'
        ? 'trimmed'
        : 'transparent';
  anchor.download = `${safeFileName(state.mainText)}-${suffix}.png`;
  anchor.href = objectUrl;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  return { width: output.width, height: output.height };
}
