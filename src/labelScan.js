// Reads a wine label photo on-device with PaddleOCR (PP-OCRv6 small) and returns form suggestions.
// The OCR engine (~30 MB models + runtime) is loaded lazily on the first scan and reused afterwards.
// The photo never leaves the device; only the model files are downloaded.

import { parseLabelLines } from './labelParser.js';

const MAX_OCR_SIDE = 1600;
let enginePromise;

async function createEngine() {
  const { PaddleOCR } = await import('@paddleocr/paddleocr-js');
  const options = {
    textDetectionModelName: 'PP-OCRv6_small_det',
    textRecognitionModelName: 'PP-OCRv6_small_rec',
    // __ORT_WASM_PATH__ is injected by vite.config.js
    ortOptions: { backend: 'auto', wasmPaths: __ORT_WASM_PATH__ },
  };
  try {
    return await PaddleOCR.create({ ...options, worker: true });
  } catch (error) {
    console.warn('Label scan: worker mode unavailable, running OCR on the main thread.', error);
    return PaddleOCR.create(options);
  }
}

function getEngine() {
  enginePromise ??= createEngine().catch((error) => {
    enginePromise = undefined; // allow a retry, e.g. after the connection is back
    throw error;
  });
  return enginePromise;
}

async function downscale(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_OCR_SIDE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1) return bitmap;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return createImageBitmap(canvas);
}

export function toOcrLines(items = []) {
  return items
    .filter((item) => item?.text && Array.isArray(item.poly) && item.poly.length)
    .map((item) => {
      const ys = item.poly.map((point) => point[1]);
      const xs = item.poly.map((point) => point[0]);
      return { text: item.text, top: Math.min(...ys), left: Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
    })
    .sort((a, b) => (Math.abs(a.top - b.top) < Math.max(8, Math.min(a.height, b.height) / 2) ? a.left - b.left : a.top - b.top))
    .map(({ text, height }) => ({ text, height }));
}

export async function scanWineLabel(file) {
  const engine = await getEngine();
  const image = await downscale(file);
  const [result] = await engine.predict(image);
  const lines = toOcrLines(result?.items);
  return { lines, suggestions: parseLabelLines(lines) };
}
