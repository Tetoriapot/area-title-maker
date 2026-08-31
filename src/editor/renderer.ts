import type {
  EditorState,
  RenderOptions,
  TextStyle,
} from '@/src/types';

type PaintMode = 'fill' | 'stroke';

function colorWithAlpha(color: string, alpha: number) {
  const normalized = color.trim();
  if (/^#[0-9a-f]{6}$/i.test(normalized)) {
    const value = Number.parseInt(normalized.slice(1), 16);
    return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
  }
  if (/^#[0-9a-f]{3}$/i.test(normalized)) {
    const [r, g, b] = normalized.slice(1).split('').map((char) => Number.parseInt(char + char, 16));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

function graphemes(text: string) {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    return Array.from(segmenter.segment(text), (entry) => entry.segment);
  }
  return Array.from(text);
}

function fontString(style: TextStyle, size: number) {
  return `${style.italic ? 'italic ' : ''}${style.weight} ${Math.max(1, size)}px ${style.fontFamily}`;
}

export function measureTrackedText(
  context: CanvasRenderingContext2D,
  text: string,
  letterSpacing: number,
) {
  const segments = graphemes(text);
  if (segments.length === 0) return 0;
  return (
    segments.reduce((total, segment) => total + context.measureText(segment).width, 0) +
    Math.max(0, segments.length - 1) * letterSpacing
  );
}

function drawTrackedLine(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  letterSpacing: number,
  mode: PaintMode,
) {
  const segments = graphemes(text);
  const widths = segments.map((segment) => context.measureText(segment).width);
  const totalWidth =
    widths.reduce((total, width) => total + width, 0) +
    Math.max(0, segments.length - 1) * letterSpacing;
  let cursor = x - totalWidth / 2;

  segments.forEach((segment, index) => {
    const center = cursor + widths[index] / 2;
    if (mode === 'stroke') context.strokeText(segment, center, y);
    else context.fillText(segment, center, y);
    cursor += widths[index] + letterSpacing;
  });
}

function fittedText(
  context: CanvasRenderingContext2D,
  text: string,
  style: TextStyle,
  unit: number,
  maxWidth: number,
  autoFit: boolean,
) {
  const lines = text.split(/\r?\n/).slice(0, 4);
  let size = style.size * unit;
  let spacing = style.letterSpacing * unit;
  context.font = fontString(style, size);
  const width = Math.max(
    0,
    ...lines.map((line) => measureTrackedText(context, line, spacing)),
  );
  if (autoFit && width > maxWidth && width > 0) {
    const fitRatio = Math.max(0.22, maxWidth / width);
    size *= fitRatio;
    spacing *= fitRatio;
    context.font = fontString(style, size);
  }
  return { lines, size, spacing };
}

function drawStyledText(
  context: CanvasRenderingContext2D,
  text: string,
  style: TextStyle,
  x: number,
  y: number,
  unit: number,
  maxWidth: number,
  autoFit: boolean,
  state: EditorState,
) {
  if (!text.trim()) return;
  const fitted = fittedText(context, text, style, unit, maxWidth, autoFit);
  const lineHeight = fitted.size * 1.25;
  const firstY = y - ((fitted.lines.length - 1) * lineHeight) / 2;
  const paintLines = (mode: PaintMode) => {
    fitted.lines.forEach((line, index) => {
      drawTrackedLine(
        context,
        line,
        x,
        firstY + lineHeight * index,
        fitted.spacing,
        mode,
      );
    });
  };

  context.save();
  context.font = fontString(style, fitted.size);
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.filter = state.effects.blur > 0 ? `blur(${state.effects.blur * unit}px)` : 'none';
  context.fillStyle = style.color;

  if (state.effects.glow.enabled) {
    context.save();
    context.globalAlpha = style.opacity * 0.78;
    context.shadowColor = colorWithAlpha(
      state.effects.glow.color,
      state.effects.glow.opacity,
    );
    context.shadowBlur = state.effects.glow.blur * unit;
    paintLines('fill');
    context.restore();
  }

  if (state.effects.shadow.enabled) {
    context.save();
    context.globalAlpha = style.opacity;
    context.shadowColor = colorWithAlpha(
      state.effects.shadow.color,
      state.effects.shadow.opacity,
    );
    context.shadowBlur = state.effects.shadow.blur * unit;
    context.shadowOffsetX = state.effects.shadow.x * unit;
    context.shadowOffsetY = state.effects.shadow.y * unit;
    paintLines('fill');
    context.restore();
  }

  if (state.effects.stroke.enabled && state.effects.stroke.width > 0) {
    context.save();
    context.globalAlpha = style.opacity;
    context.strokeStyle = state.effects.stroke.color;
    context.lineWidth = state.effects.stroke.width * unit * 2;
    context.lineJoin = 'round';
    paintLines('stroke');
    context.restore();
  }

  context.globalAlpha = style.opacity;
  context.fillStyle = style.color;
  paintLines('fill');
  context.restore();
}

function drawCover(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  width: number,
  height: number,
  blur: number,
) {
  const sizedImage = image as CanvasImageSource & {
    naturalWidth?: number;
    naturalHeight?: number;
    videoWidth?: number;
    videoHeight?: number;
    width?: number;
    height?: number;
    displayWidth?: number;
    displayHeight?: number;
  };
  const imageWidth =
    sizedImage.naturalWidth ?? sizedImage.videoWidth ?? sizedImage.width ?? sizedImage.displayWidth ?? 0;
  const imageHeight =
    sizedImage.naturalHeight ?? sizedImage.videoHeight ?? sizedImage.height ?? sizedImage.displayHeight ?? 0;
  if (!imageWidth || !imageHeight) return;
  const coverScale = Math.max(width / imageWidth, height / imageHeight);
  const extraScale = blur > 0 ? 1 + (blur * 4) / Math.min(width, height) : 1;
  const drawWidth = imageWidth * coverScale * extraScale;
  const drawHeight = imageHeight * coverScale * extraScale;
  context.save();
  context.filter = blur > 0 ? `blur(${blur}px)` : 'none';
  context.drawImage(
    image,
    (width - drawWidth) / 2,
    (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
  context.restore();
}

function drawDecoration(
  context: CanvasRenderingContext2D,
  state: EditorState,
  x: number,
  y: number,
  unit: number,
  inlineTextWidth = 0,
) {
  const decoration = state.decoration;
  if (decoration.lineStyle === 'none' || decoration.width <= 0) return;

  const halfWidth = Math.max(0, (decoration.width / 2 - decoration.sidePadding) * unit);
  const thickness = Math.max(0.5, decoration.thickness * unit);
  const symbol = inlineTextWidth > 0 ? '' : decoration.symbol;
  const symbolSize = Math.max(18, 32 * unit);
  context.save();
  context.globalAlpha = decoration.opacity;
  context.strokeStyle = decoration.color;
  context.fillStyle = decoration.color;
  context.lineWidth =
    decoration.lineStyle === 'bold' ? thickness * 1.8 :
      decoration.lineStyle === 'thin' ? thickness * 0.6 : thickness;
  context.lineCap = decoration.lineStyle === 'dotted' ? 'round' : 'butt';
  if (decoration.lineStyle === 'dashed') context.setLineDash([18 * unit, 12 * unit]);
  if (decoration.lineStyle === 'dotted') context.setLineDash([1 * unit, 12 * unit]);

  context.font = `400 ${symbolSize}px Georgia, serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const symbolHalf = symbol ? context.measureText(symbol).width / 2 : 0;
  const centerGap = inlineTextWidth > 0
    ? inlineTextWidth / 2 + decoration.gap * unit
    : symbol
      ? symbolHalf + decoration.gap * unit
      : 0;
  const leftStart = x - halfWidth;
  const leftEnd = x - centerGap;
  const rightStart = x + centerGap;
  const rightEnd = x + halfWidth;

  const strokeSegment = (start: number, end: number, lineY: number, fade: boolean) => {
    if (end <= start) return;
    if (fade) {
      const gradient = context.createLinearGradient(start, lineY, end, lineY);
      const leftSide = end <= x;
      gradient.addColorStop(0, colorWithAlpha(decoration.color, leftSide ? 0 : 1));
      gradient.addColorStop(1, colorWithAlpha(decoration.color, leftSide ? 1 : 0));
      context.strokeStyle = gradient;
    } else {
      context.strokeStyle = decoration.color;
    }
    context.beginPath();
    context.moveTo(start, lineY);
    context.lineTo(end, lineY);
    context.stroke();
  };

  const offsets = decoration.lineStyle === 'double' ? [-4 * unit, 4 * unit] : [0];
  offsets.forEach((offset) => {
    const fade = decoration.lineStyle === 'fade';
    if (centerGap > 0) {
      strokeSegment(leftStart, leftEnd, y + offset, fade);
      strokeSegment(rightStart, rightEnd, y + offset, fade);
    } else {
      strokeSegment(leftStart, rightEnd, y + offset, fade);
    }
  });

  if (symbol) context.fillText(symbol, x, y + 1 * unit);
  context.restore();
}

function drawGuide(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  safeArea: 50 | 70,
) {
  const fraction = safeArea / 100;
  const guideWidth = width * fraction;
  const guideHeight = height * fraction;
  context.save();
  context.strokeStyle = 'rgba(214, 181, 110, .32)';
  context.lineWidth = Math.max(1, width / 1920);
  context.setLineDash([8 * width / 1920, 8 * width / 1920]);
  context.strokeRect(
    (width - guideWidth) / 2,
    (height - guideHeight) / 2,
    guideWidth,
    guideHeight,
  );
  context.restore();
}

export function renderTitleCard(
  canvas: HTMLCanvasElement,
  state: EditorState,
  options: RenderOptions = {},
) {
  const width = state.canvas.width;
  const height = state.canvas.height;
  const bitmapScale = options.bitmapScale ?? 1;
  canvas.width = Math.max(1, Math.round(width * bitmapScale));
  canvas.height = Math.max(1, Math.round(height * bitmapScale));
  const context = canvas.getContext('2d');
  if (!context) return;
  context.setTransform(bitmapScale, 0, 0, bitmapScale, 0, 0);
  context.clearRect(0, 0, width, height);

  if (options.backgroundImage && options.includeBackground) {
    drawCover(
      context,
      options.backgroundImage,
      width,
      height,
      state.backgroundBlur,
    );
    if (state.backgroundDarkness > 0) {
      context.save();
      context.fillStyle = `rgba(0, 0, 0, ${state.backgroundDarkness / 100})`;
      context.fillRect(0, 0, width, height);
      context.restore();
    }
  }

  const unit = width / 1920;
  const x = width * (0.5 + state.position.x / 100);
  const y = height * (0.5 + state.position.y / 100);
  const maxTextWidth = width * 0.86;
  context.font = fontString(state.mainTextStyle, state.mainTextStyle.size * unit);
  const mainFitted = fittedText(
    context,
    state.mainText,
    state.mainTextStyle,
    unit,
    maxTextWidth,
    state.canvas.autoFit,
  );
  const mainWidth = Math.max(
    0,
    ...mainFitted.lines.map((line) =>
      measureTrackedText(context, line, mainFitted.spacing),
    ),
  );
  const hasSub = Boolean(state.subText.trim());

  let mainY = y;
  let subY = y;
  const decorationJobs: Array<{ y: number; inlineWidth?: number }> = [];
  switch (state.layout) {
    case 'A':
      mainY = y - (hasSub ? 58 : 40) * unit;
      if (hasSub) subY = y + 18 * unit;
      decorationJobs.push({ y: y + (hasSub ? 90 : 62) * unit });
      break;
    case 'B':
      decorationJobs.push({ y: y - (hasSub ? 92 : 62) * unit });
      mainY = y - (hasSub ? 12 : -32) * unit;
      subY = y + 62 * unit;
      break;
    case 'C':
      mainY = y - (hasSub ? 94 : 46) * unit;
      decorationJobs.push({ y: y + (hasSub ? 0 : 48) * unit });
      subY = y + 78 * unit;
      break;
    case 'D':
      decorationJobs.push({ y: y - (hasSub ? 96 : 62) * unit });
      mainY = y - (hasSub ? 8 : -30) * unit;
      subY = y + 72 * unit;
      break;
    case 'E':
      mainY = y - (hasSub ? 36 : 0) * unit;
      decorationJobs.push({ y: mainY, inlineWidth: mainWidth });
      subY = y + 58 * unit;
      break;
    case 'F':
      mainY = y - (hasSub ? 42 : 0) * unit;
      subY = y + 46 * unit;
      break;
    case 'G':
      decorationJobs.push({ y: y - (hasSub ? 138 : 94) * unit });
      mainY = y - (hasSub ? 38 : 0) * unit;
      subY = y + 46 * unit;
      decorationJobs.push({ y: y + (hasSub ? 138 : 94) * unit });
      break;
  }

  decorationJobs.forEach((job) =>
    drawDecoration(context, state, x, job.y, unit, job.inlineWidth),
  );
  drawStyledText(
    context,
    state.mainText,
    state.mainTextStyle,
    x,
    mainY,
    unit,
    maxTextWidth,
    state.canvas.autoFit,
    state,
  );
  if (hasSub) {
    drawStyledText(
      context,
      state.subText,
      state.subTextStyle,
      x,
      subY,
      unit,
      maxTextWidth,
      state.canvas.autoFit,
      state,
    );
  }

  if (options.drawGuide && state.canvas.safeArea !== 0) {
    drawGuide(context, width, height, state.canvas.safeArea);
  }
}
