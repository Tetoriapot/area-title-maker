import type { EditorState, RenderOptions, TextStyle } from '@/src/types';

type PaintMode = 'fill' | 'stroke';

function colorWithAlpha(color: string, alpha: number) {
  const normalized = color.trim();
  if (/^#[0-9a-f]{6}$/i.test(normalized)) {
    const value = Number.parseInt(normalized.slice(1), 16);
    return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
  }
  if (/^#[0-9a-f]{3}$/i.test(normalized)) {
    const [r, g, b] = normalized
      .slice(1)
      .split('')
      .map((char) => Number.parseInt(char + char, 16));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

function graphemes(text: string) {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter(undefined, {
      granularity: 'grapheme',
    });
    return Array.from(segmenter.segment(text), (entry) => entry.segment);
  }
  return Array.from(text);
}

function fontString(style: TextStyle, size: number) {
  return `${style.italic ? 'italic ' : ''}${style.weight} ${Math.max(0.01, size)}px ${style.fontFamily}`;
}

export function measureTrackedText(
  context: CanvasRenderingContext2D,
  text: string,
  letterSpacing: number,
) {
  const segments = graphemes(text);
  if (segments.length === 0) return 0;
  return (
    segments.reduce(
      (total, segment) => total + context.measureText(segment).width,
      0,
    ) +
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
  maxHeight: number,
  autoFit: boolean,
) {
  const lines = text.split(/\r?\n/);
  let size = style.size * unit;
  let spacing = style.letterSpacing * unit;
  context.font = fontString(style, size);
  const width = Math.max(
    0,
    ...lines.map((line) => measureTrackedText(context, line, spacing)),
  );
  const initialHeight = Math.max(1, lines.length) * size * 1.25;
  if (autoFit && (width > maxWidth || initialHeight > maxHeight)) {
    const widthRatio = width > 0 ? maxWidth / width : 1;
    const heightRatio = initialHeight > 0 ? maxHeight / initialHeight : 1;
    const fitRatio = Math.min(1, widthRatio, heightRatio);
    size *= fitRatio;
    spacing *= fitRatio;
    context.font = fontString(style, size);
  }
  const lineHeight = size * 1.25;
  return {
    lines,
    size,
    spacing,
    lineHeight,
    blockHeight: Math.max(1, lines.length) * lineHeight,
  };
}

type FittedText = ReturnType<typeof fittedText>;

function drawStyledText(
  context: CanvasRenderingContext2D,
  text: string,
  style: TextStyle,
  x: number,
  y: number,
  unit: number,
  fitted: FittedText,
  state: EditorState,
) {
  if (!text.trim()) return;
  const firstY = y - ((fitted.lines.length - 1) * fitted.lineHeight) / 2;
  const paintLines = (
    target: CanvasRenderingContext2D,
    mode: PaintMode,
    originX = x,
    originFirstY = firstY,
    coordinateScale = 1,
  ) => {
    target.font = fontString(style, fitted.size * coordinateScale);
    target.textAlign = 'center';
    target.textBaseline = 'middle';
    fitted.lines.forEach((line, index) => {
      drawTrackedLine(
        target,
        line,
        originX,
        originFirstY + fitted.lineHeight * coordinateScale * index,
        fitted.spacing * coordinateScale,
        mode,
      );
    });
  };

  const transform = context.getTransform();
  const bitmapScale = Math.max(0.01, Math.hypot(transform.a, transform.b));
  const physicalX = transform.a * x + transform.c * firstY + transform.e;
  const physicalFirstY = transform.b * x + transform.d * firstY + transform.f;
  const hasGlow = state.effects.glow.enabled && state.effects.glow.opacity > 0;
  const hasShadow =
    state.effects.shadow.enabled && state.effects.shadow.opacity > 0;

  if (hasGlow || hasShadow) {
    const sourceShift = context.canvas.width * 2 + 512 * bitmapScale;
    const paintEffect = (
      color: string,
      opacity: number,
      blur: number,
      offsetX: number,
      offsetY: number,
    ) => {
      context.save();
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.filter =
        state.effects.blur > 0
          ? `blur(${state.effects.blur * unit * bitmapScale}px)`
          : 'none';
      context.fillStyle = style.color;
      context.globalAlpha = style.opacity;
      context.shadowColor = colorWithAlpha(color, opacity);
      context.shadowBlur = blur * unit * bitmapScale;
      context.shadowOffsetX = offsetX * unit * bitmapScale - sourceShift;
      context.shadowOffsetY = offsetY * unit * bitmapScale;
      paintLines(
        context,
        'fill',
        physicalX + sourceShift,
        physicalFirstY,
        bitmapScale,
      );
      context.restore();
    };

    if (hasGlow) {
      paintEffect(
        state.effects.glow.color,
        state.effects.glow.opacity,
        state.effects.glow.blur,
        0,
        0,
      );
    }

    if (hasShadow) {
      paintEffect(
        state.effects.shadow.color,
        state.effects.shadow.opacity,
        state.effects.shadow.blur,
        state.effects.shadow.x,
        state.effects.shadow.y,
      );
    }
  }

  context.save();
  context.font = fontString(style, fitted.size);
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.filter =
    state.effects.blur > 0
      ? `blur(${state.effects.blur * unit * bitmapScale}px)`
      : 'none';
  context.fillStyle = style.color;

  if (state.effects.stroke.enabled && state.effects.stroke.width > 0) {
    context.save();
    context.globalAlpha = style.opacity;
    context.strokeStyle = state.effects.stroke.color;
    context.lineWidth = state.effects.stroke.width * unit * 2;
    context.lineJoin = 'round';
    paintLines(context, 'stroke');
    context.restore();
  }

  context.globalAlpha = style.opacity;
  context.fillStyle = style.color;
  paintLines(context, 'fill');
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
    sizedImage.naturalWidth ??
    sizedImage.videoWidth ??
    sizedImage.width ??
    sizedImage.displayWidth ??
    0;
  const imageHeight =
    sizedImage.naturalHeight ??
    sizedImage.videoHeight ??
    sizedImage.height ??
    sizedImage.displayHeight ??
    0;
  if (!imageWidth || !imageHeight) return;
  const coverScale = Math.max(width / imageWidth, height / imageHeight);
  const extraScale = blur > 0 ? 1 + (blur * 4) / Math.min(width, height) : 1;
  const drawWidth = imageWidth * coverScale * extraScale;
  const drawHeight = imageHeight * coverScale * extraScale;
  const transform = context.getTransform();
  const bitmapScale = Math.max(0.01, Math.hypot(transform.a, transform.b));
  context.save();
  context.filter = blur > 0 ? `blur(${blur * bitmapScale}px)` : 'none';
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

  const halfWidth = Math.max(
    0,
    (decoration.width / 2 - decoration.sidePadding) * unit,
  );
  const thickness = Math.max(0.5, decoration.thickness * unit);
  const symbol = inlineTextWidth > 0 ? '' : decoration.symbol;
  const symbolSize = Math.max(0.01, 32 * unit);
  context.save();
  context.globalAlpha = decoration.opacity;
  context.strokeStyle = decoration.color;
  context.fillStyle = decoration.color;
  context.lineWidth =
    decoration.lineStyle === 'bold'
      ? thickness * 1.8
      : decoration.lineStyle === 'thin'
        ? thickness * 0.6
        : thickness;
  context.lineCap = decoration.lineStyle === 'dotted' ? 'round' : 'butt';
  if (decoration.lineStyle === 'dashed')
    context.setLineDash([18 * unit, 12 * unit]);
  if (decoration.lineStyle === 'dotted')
    context.setLineDash([1 * unit, 12 * unit]);

  context.font = `400 ${symbolSize}px Georgia, serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const symbolHalf = symbol ? context.measureText(symbol).width / 2 : 0;
  const symbolGap = symbol
    ? symbolHalf + decoration.gap * unit
    : decoration.gap * unit;
  let centerGap = 0;
  if (inlineTextWidth > 0) {
    const inlineGap = inlineTextWidth / 2 + decoration.gap * unit;
    if (decoration.lineStyle === 'sides') {
      centerGap = Math.max(halfWidth * 0.62, inlineGap);
    } else if (decoration.lineStyle !== 'single') {
      centerGap = inlineGap;
    }
  } else if (decoration.lineStyle === 'split') {
    centerGap = Math.max(20 * unit, symbolGap);
  } else if (decoration.lineStyle === 'sides') {
    centerGap = Math.max(halfWidth * 0.62, symbolGap);
  } else if (decoration.lineStyle !== 'single' && symbol) {
    centerGap = symbolGap;
  }
  const leftStart = x - halfWidth;
  const leftEnd = x - centerGap;
  const rightStart = x + centerGap;
  const rightEnd = x + halfWidth;

  const strokeSegment = (
    start: number,
    end: number,
    lineY: number,
    fade: boolean,
  ) => {
    if (end <= start) return;
    if (fade) {
      const gradient = context.createLinearGradient(start, lineY, end, lineY);
      const leftSide = end <= x;
      gradient.addColorStop(
        0,
        colorWithAlpha(decoration.color, leftSide ? 0 : 1),
      );
      gradient.addColorStop(
        1,
        colorWithAlpha(decoration.color, leftSide ? 1 : 0),
      );
      context.strokeStyle = gradient;
    } else {
      context.strokeStyle = decoration.color;
    }
    context.beginPath();
    context.moveTo(start, lineY);
    context.lineTo(end, lineY);
    context.stroke();
  };

  const offsets =
    decoration.lineStyle === 'double' ? [-4 * unit, 4 * unit] : [0];
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
  context.setLineDash([(8 * width) / 1920, (8 * width) / 1920]);
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

  const unit = Math.min(width / 1920, height / 480);
  const x = width * (0.5 + state.position.x / 100);
  const y = height * (0.5 + state.position.y / 100);
  const maxTextWidth = width * 0.86;
  const hasMain = Boolean(state.mainText.trim());
  const hasSub = Boolean(state.subText.trim());
  const maxMainHeight = height * 0.36;
  const maxSubHeight = height * 0.18;
  const mainFitted = fittedText(
    context,
    state.mainText,
    state.mainTextStyle,
    unit,
    maxTextWidth,
    maxMainHeight,
    state.canvas.autoFit,
  );
  context.font = fontString(state.mainTextStyle, mainFitted.size);
  const mainWidth = Math.max(
    0,
    ...mainFitted.lines.map((line) =>
      measureTrackedText(context, line, mainFitted.spacing),
    ),
  );
  const subFitted = fittedText(
    context,
    state.subText,
    state.subTextStyle,
    unit,
    maxTextWidth,
    maxSubHeight,
    state.canvas.autoFit,
  );
  const mainExtraHeight = hasMain
    ? Math.max(0, mainFitted.blockHeight - mainFitted.lineHeight)
    : 0;
  const mainCenterShift = mainExtraHeight / 2;
  const subExtraHeight = hasSub
    ? Math.max(0, subFitted.blockHeight - subFitted.lineHeight)
    : 0;
  const subCenterShift = subExtraHeight / 2;

  let mainY = y;
  let subY = y;
  const decorationJobs: Array<{ y: number; inlineWidth?: number }> = [];
  switch (state.layout) {
    case 'A':
      mainY = y - (hasSub ? 58 : 40) * unit - mainCenterShift;
      if (hasSub) subY = y + 18 * unit;
      decorationJobs.push({
        y: y + (hasSub ? 90 : 62) * unit + subExtraHeight,
      });
      break;
    case 'B':
      decorationJobs.push({
        y: y - (hasSub ? 92 : 62) * unit - mainExtraHeight,
      });
      mainY = y - (hasSub ? 12 : -32) * unit - mainCenterShift;
      subY = y + 62 * unit;
      break;
    case 'C':
      mainY = y - (hasSub ? 94 : 46) * unit - mainCenterShift;
      decorationJobs.push({ y: y + (hasSub ? 0 : 48) * unit });
      subY = y + 78 * unit;
      break;
    case 'D':
      decorationJobs.push({
        y: y - (hasSub ? 96 : 62) * unit - mainExtraHeight,
      });
      mainY = y - (hasSub ? 8 : -30) * unit - mainCenterShift;
      subY = y + 72 * unit;
      break;
    case 'E':
      mainY = y - (hasSub ? 36 : 0) * unit - mainCenterShift;
      decorationJobs.push({ y: mainY, inlineWidth: mainWidth });
      subY = y + 58 * unit;
      break;
    case 'F':
      mainY = y - (hasSub ? 42 : 0) * unit - mainCenterShift;
      subY = y + 46 * unit;
      break;
    case 'G':
      decorationJobs.push({
        y: y - (hasSub ? 138 : 94) * unit - mainExtraHeight,
      });
      mainY = y - (hasSub ? 38 : 0) * unit - mainCenterShift;
      subY = y + 46 * unit;
      decorationJobs.push({
        y: y + (hasSub ? 138 : 94) * unit + subExtraHeight,
      });
      break;
  }
  if (hasSub) subY += subCenterShift;

  const verticalBounds: Array<{ top: number; bottom: number }> = [];
  if (hasMain) {
    verticalBounds.push({
      top: mainY - mainFitted.blockHeight / 2,
      bottom: mainY + mainFitted.blockHeight / 2,
    });
  }
  if (hasSub) {
    verticalBounds.push({
      top: subY - subFitted.blockHeight / 2,
      bottom: subY + subFitted.blockHeight / 2,
    });
  }
  if (state.decoration.lineStyle !== 'none' && state.decoration.width > 0) {
    const renderedThickness =
      Math.max(0.5, state.decoration.thickness * unit) *
      (state.decoration.lineStyle === 'bold'
        ? 1.8
        : state.decoration.lineStyle === 'thin'
          ? 0.6
          : 1);
    const lineHalfHeight =
      state.decoration.lineStyle === 'double'
        ? 4 * unit + renderedThickness / 2
        : renderedThickness / 2;
    decorationJobs.forEach((job) => {
      const symbolHalfHeight =
        (job.inlineWidth ?? 0) > 0 || !state.decoration.symbol ? 0 : 16 * unit;
      const halfHeight = Math.max(lineHalfHeight, symbolHalfHeight);
      verticalBounds.push({
        top: job.y - halfHeight,
        bottom: job.y + halfHeight,
      });
    });
  }

  let compositionScale = 1;
  let compositionShiftY = 0;
  if (state.canvas.autoFit && verticalBounds.length > 0) {
    const contentTop = Math.min(...verticalBounds.map((bound) => bound.top));
    const contentBottom = Math.max(
      ...verticalBounds.map((bound) => bound.bottom),
    );
    const contentHeight = Math.max(0.01, contentBottom - contentTop);
    const margin = Math.min(height * 0.01, 16 * unit);
    const availableHeight = Math.max(1, height - margin * 2);
    compositionScale = Math.min(1, availableHeight / contentHeight);
    const scaledTop = y + (contentTop - y) * compositionScale;
    const scaledBottom = y + (contentBottom - y) * compositionScale;
    if (scaledTop < margin) compositionShiftY = margin - scaledTop;
    if (scaledBottom + compositionShiftY > height - margin) {
      compositionShiftY += height - margin - (scaledBottom + compositionShiftY);
    }
  }

  context.save();
  if (compositionScale < 1 || compositionShiftY !== 0) {
    context.translate(x, y + compositionShiftY);
    context.scale(compositionScale, compositionScale);
    context.translate(-x, -y);
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
    mainFitted,
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
      subFitted,
      state,
    );
  }
  context.restore();

  if (options.drawGuide && state.canvas.safeArea !== 0) {
    drawGuide(context, width, height, state.canvas.safeArea);
  }
}
