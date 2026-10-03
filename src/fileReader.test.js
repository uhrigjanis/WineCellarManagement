import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileAsArrayBuffer, readFileAsText } from './fileReader.js';

test('reads file contents through FileReader for text and binary data', async () => {
  const originalFileReader = globalThis.FileReader;
  globalThis.FileReader = class {
    readAsText(file) {
      this.result = file.text;
      this.onload();
    }

    readAsArrayBuffer(file) {
      this.result = file.buffer;
      this.onload();
    }
  };

  try {
    assert.equal(await readFileAsText({ text: 'cellar data' }), 'cellar data');
    const buffer = new ArrayBuffer(4);
    assert.equal(await readFileAsArrayBuffer({ buffer }), buffer);
  } finally {
    if (originalFileReader === undefined) {
      delete globalThis.FileReader;
    } else {
      globalThis.FileReader = originalFileReader;
    }
  }
});
