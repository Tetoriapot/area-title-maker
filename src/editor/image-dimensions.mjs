/**
 * Read dimensions from an allowed image container without asking the browser
 * to decode the pixels first. This keeps oversized images from being expanded
 * in memory before the upload limits are checked.
 *
 * @param {ArrayBuffer} buffer
 * @param {string} mimeType
 * @returns {{ width: number, height: number } | null}
 */
export function readSupportedImageDimensions(buffer, mimeType) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);

  switch (mimeType) {
    case 'image/png':
      return readPngDimensions(bytes, view);
    case 'image/jpeg':
      return readJpegDimensions(bytes, view);
    case 'image/webp':
      return readWebpDimensions(bytes, view);
    default:
      return null;
  }
}

function readPngDimensions(bytes, view) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (
    bytes.length < 24 ||
    !signature.every((value, index) => bytes[index] === value) ||
    readAscii(bytes, 12, 4) !== 'IHDR'
  ) {
    return null;
  }

  return dimensions(view.getUint32(16), view.getUint32(20));
}

function readJpegDimensions(bytes, view) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) return null;

    const marker = bytes[offset];
    offset += 1;
    if (marker === 0xd9 || marker === 0xda) return null;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
    if (offset + 2 > bytes.length) return null;

    const segmentLength = view.getUint16(offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) {
      return null;
    }

    if (isJpegStartOfFrame(marker)) {
      if (segmentLength < 7) return null;
      return dimensions(view.getUint16(offset + 5), view.getUint16(offset + 3));
    }

    offset += segmentLength;
  }

  return null;
}

function isJpegStartOfFrame(marker) {
  return (
    marker >= 0xc0 &&
    marker <= 0xcf &&
    marker !== 0xc4 &&
    marker !== 0xc8 &&
    marker !== 0xcc
  );
}

function readWebpDimensions(bytes, view) {
  if (
    bytes.length < 20 ||
    readAscii(bytes, 0, 4) !== 'RIFF' ||
    readAscii(bytes, 8, 4) !== 'WEBP'
  ) {
    return null;
  }

  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const chunkType = readAscii(bytes, offset, 4);
    const chunkLength = view.getUint32(offset + 4, true);
    const dataOffset = offset + 8;
    if (dataOffset + chunkLength > bytes.length) return null;

    if (chunkType === 'VP8X' && chunkLength >= 10) {
      return dimensions(
        readUint24(bytes, dataOffset + 4) + 1,
        readUint24(bytes, dataOffset + 7) + 1,
      );
    }

    if (
      chunkType === 'VP8L' &&
      chunkLength >= 5 &&
      bytes[dataOffset] === 0x2f
    ) {
      const width =
        1 + bytes[dataOffset + 1] + ((bytes[dataOffset + 2] & 0x3f) << 8);
      const height =
        1 +
        (bytes[dataOffset + 2] >> 6) +
        (bytes[dataOffset + 3] << 2) +
        ((bytes[dataOffset + 4] & 0x0f) << 10);
      return dimensions(width, height);
    }

    if (
      chunkType === 'VP8 ' &&
      chunkLength >= 10 &&
      bytes[dataOffset + 3] === 0x9d &&
      bytes[dataOffset + 4] === 0x01 &&
      bytes[dataOffset + 5] === 0x2a
    ) {
      return dimensions(
        view.getUint16(dataOffset + 6, true) & 0x3fff,
        view.getUint16(dataOffset + 8, true) & 0x3fff,
      );
    }

    offset = dataOffset + chunkLength + (chunkLength % 2);
  }

  return null;
}

function readAscii(bytes, offset, length) {
  if (offset < 0 || offset + length > bytes.length) return '';
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function readUint24(bytes, offset) {
  return bytes[offset] + (bytes[offset + 1] << 8) + (bytes[offset + 2] << 16);
}

function dimensions(width, height) {
  return Number.isSafeInteger(width) &&
    Number.isSafeInteger(height) &&
    width > 0 &&
    height > 0
    ? { width, height }
    : null;
}
