import assert from 'node:assert/strict';
import test from 'node:test';

import { readSupportedImageDimensions } from '../src/editor/image-dimensions.mjs';

test('reads PNG dimensions only when the PNG signature is valid', () => {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  bytes.set([73, 72, 68, 82], 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, 4096);
  view.setUint32(20, 2160);

  assert.deepEqual(readSupportedImageDimensions(bytes.buffer, 'image/png'), {
    width: 4096,
    height: 2160,
  });
  bytes[0] = 0;
  assert.equal(readSupportedImageDimensions(bytes.buffer, 'image/png'), null);
});

test('reads JPEG start-of-frame dimensions', () => {
  const bytes = Uint8Array.from([
    0xff, 0xd8, 0xff, 0xc0, 0x00, 0x07, 0x08, 0x04, 0x38, 0x07, 0x80,
  ]);

  assert.deepEqual(readSupportedImageDimensions(bytes.buffer, 'image/jpeg'), {
    width: 1920,
    height: 1080,
  });
});

test('reads extended WebP canvas dimensions', () => {
  const bytes = new Uint8Array(30);
  bytes.set([82, 73, 70, 70], 0);
  bytes.set([87, 69, 66, 80], 8);
  bytes.set([86, 80, 56, 88], 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(4, 22, true);
  view.setUint32(16, 10, true);
  writeUint24(bytes, 24, 1600 - 1);
  writeUint24(bytes, 27, 900 - 1);

  assert.deepEqual(readSupportedImageDimensions(bytes.buffer, 'image/webp'), {
    width: 1600,
    height: 900,
  });
});

test('rejects unsupported MIME types and truncated data', () => {
  const bytes = new Uint8Array(8);
  assert.equal(readSupportedImageDimensions(bytes.buffer, 'image/gif'), null);
  assert.equal(readSupportedImageDimensions(bytes.buffer, 'image/webp'), null);
});

function writeUint24(bytes, offset, value) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >> 8) & 0xff;
  bytes[offset + 2] = (value >> 16) & 0xff;
}
