import test from 'node:test';
import assert from 'node:assert/strict';
import { validateImageFile } from './wineImage.js';

const imageFile = (overrides = {}) => ({
  name: 'wine-label.jpg',
  type: 'image/jpeg',
  size: 1024,
  ...overrides,
});

test('accepts supported image files within the size limit', () => {
  assert.deepEqual(validateImageFile(imageFile()), { valid: true, error: '' });
  assert.deepEqual(validateImageFile(imageFile({ type: 'image/png' })), { valid: true, error: '' });
  assert.deepEqual(validateImageFile(imageFile({ type: 'image/webp' })), { valid: true, error: '' });
});

test('rejects missing, unsupported, and oversized image files with clear errors', () => {
  assert.match(validateImageFile(null).error, /select an image/i);
  assert.match(validateImageFile(imageFile({ type: 'application/pdf' })).error, /JPG, PNG, or WebP/i);
  assert.match(validateImageFile(imageFile({ size: 5 * 1024 * 1024 + 1 })).error, /5 MB/i);
});
