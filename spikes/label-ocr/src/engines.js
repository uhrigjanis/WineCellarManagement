// Engine adapters. Each engine: { id, label, download, note, load(ctx) -> { run(blob) -> text, dispose() } }
// ctx = { device: { webgpu, f16 }, onProgress(message) }

const VLM_PROMPT = [
  'Read this wine label.',
  'Answer with JSON only, using exactly these keys:',
  'name, producer, vintage, region, country, style, grapes, alcohol.',
  'Copy names exactly as printed on the label. Use null for anything not visible.',
].join(' ');

export async function detectDevice() {
  if (!('gpu' in navigator)) return { webgpu: false, f16: false };
  try {
    const adapter = await navigator.gpu.requestAdapter();
    return { webgpu: Boolean(adapter), f16: Boolean(adapter?.features.has('shader-f16')) };
  } catch {
    return { webgpu: false, f16: false };
  }
}

export async function resizeImage(blob, maxSide) {
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
}

function transformersProgress(onProgress) {
  const files = new Map();
  return (event) => {
    if (event.status !== 'progress' || !event.total) return;
    files.set(event.file, { loaded: event.loaded, total: event.total });
    let loaded = 0;
    let total = 0;
    for (const file of files.values()) {
      loaded += file.loaded;
      total += file.total;
    }
    onProgress(`Lade Modell … ${(loaded / 1e6).toFixed(0)} / ${(total / 1e6).toFixed(0)} MB`);
  };
}

const tesseract = {
  id: 'tesseract',
  label: 'Tesseract.js 7 (Basis)',
  download: '~30 MB',
  note: 'Bisheriger Ansatz, ohne Vorverarbeitung',
  async load({ onProgress }) {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker(['eng', 'deu', 'fra'], 1, {
      logger: (m) => m.status && onProgress(`Tesseract: ${m.status} ${Math.round((m.progress || 0) * 100)} %`),
    });
    return {
      async run(blob) {
        const { data } = await worker.recognize(await resizeImage(blob, 2000));
        return data.text;
      },
      dispose: () => worker.terminate(),
    };
  },
};

function paddle(id, label, det, rec, download) {
  return {
    id,
    label,
    download,
    note: 'Text-OCR, läuft auch ohne WebGPU',
    async load({ onProgress }) {
      onProgress(`${label}: lade Modelle …`);
      const { PaddleOCR } = await import('@paddleocr/paddleocr-js');
      const ocr = await PaddleOCR.create({
        textDetectionModelName: det,
        textRecognitionModelName: rec,
        ortOptions: { backend: 'auto' },
      });
      return {
        async run(blob) {
          const [result] = await ocr.predict(await resizeImage(blob, 1600));
          return result.items
            .map((item) => ({ text: item.text, y: Math.min(...item.poly.map((p) => p[1])), x: Math.min(...item.poly.map((p) => p[0])) }))
            .sort((a, b) => (Math.abs(a.y - b.y) < 12 ? a.x - b.x : a.y - b.y))
            .map((item) => item.text)
            .join('\n');
        },
        dispose: () => ocr.dispose(),
      };
    },
  };
}

const florence = {
  id: 'florence2',
  label: 'Florence-2 base (OCR-Modus)',
  download: '~250 MB',
  note: 'Bildmodell, liest Text am Stück',
  async load({ device, onProgress }) {
    const { Florence2ForConditionalGeneration, AutoProcessor, RawImage } = await import('@huggingface/transformers');
    const modelId = 'onnx-community/Florence-2-base-ft';
    const dtype = device.webgpu && device.f16
      ? { embed_tokens: 'fp16', vision_encoder: 'fp16', encoder_model: 'q4', decoder_model_merged: 'q4' }
      : { embed_tokens: 'quantized', vision_encoder: 'quantized', encoder_model: 'quantized', decoder_model_merged: 'quantized' };
    const progress_callback = transformersProgress(onProgress);
    const model = await Florence2ForConditionalGeneration.from_pretrained(modelId, {
      dtype,
      device: device.webgpu ? 'webgpu' : 'wasm',
      progress_callback,
    });
    const processor = await AutoProcessor.from_pretrained(modelId);
    const task = '<OCR_WITH_REGION>';
    return {
      async run(blob) {
        const image = await RawImage.fromBlob(blob);
        const inputs = await processor(image, processor.construct_prompts(task));
        const ids = await model.generate({ ...inputs, max_new_tokens: 512 });
        const raw = processor.batch_decode(ids, { skip_special_tokens: false })[0];
        const result = processor.post_process_generation(raw, task, image.size)[task];
        return (result?.labels || []).map((line) => line.replace(/<\/?s>/g, '').trim()).join('\n');
      },
      dispose: () => model.dispose(),
    };
  },
};

function vlm({ id, label, modelId, download, note, maxSide, imageFirst, dtypes }) {
  return {
    id,
    label,
    download,
    note,
    requiresWebGPU: true,
    async load({ device, onProgress }) {
      const { AutoProcessor, AutoModelForImageTextToText, RawImage } = await import('@huggingface/transformers');
      const processor = await AutoProcessor.from_pretrained(modelId);
      const model = await AutoModelForImageTextToText.from_pretrained(modelId, {
        dtype: device.f16 ? dtypes.f16 : dtypes.f32,
        device: 'webgpu',
        progress_callback: transformersProgress(onProgress),
      });
      const prompt = processor.apply_chat_template(
        [{ role: 'user', content: [{ type: 'image' }, { type: 'text', text: VLM_PROMPT }] }],
        { add_generation_prompt: true },
      );
      return {
        async run(blob) {
          const image = await RawImage.fromBlob(await resizeImage(blob, maxSide));
          const inputs = imageFirst
            ? await processor(image, prompt, { add_special_tokens: false })
            : await processor(prompt, image);
          const out = await model.generate({ ...inputs, max_new_tokens: 300, do_sample: false });
          return processor.batch_decode(out.slice(null, [inputs.input_ids.dims.at(-1), null]), { skip_special_tokens: true })[0];
        },
        dispose: () => model.dispose(),
      };
    },
  };
}

const lfm = vlm({
  id: 'lfm25vl',
  label: 'LFM2.5-VL 450M',
  modelId: 'onnx-community/LFM2.5-VL-450M-ONNX',
  download: '~300–450 MB',
  note: 'Kleines Bildmodell, liefert Felder als JSON. Nur mit WebGPU',
  maxSide: 1024,
  imageFirst: true,
  dtypes: {
    f16: { embed_tokens: 'fp16', vision_encoder: 'fp16', decoder_model_merged: 'q4f16' },
    f32: { embed_tokens: 'q4', vision_encoder: 'q4', decoder_model_merged: 'q4' },
  },
});

const qwen = vlm({
  id: 'qwen3vl',
  label: 'Qwen3-VL 2B',
  modelId: 'onnx-community/Qwen3-VL-2B-Instruct-ONNX',
  download: '~1,4–1,9 GB',
  note: 'Stärkstes Modell; auf dem Handy evtl. zu groß. Nur mit WebGPU',
  maxSide: 896,
  imageFirst: false,
  dtypes: {
    f16: { embed_tokens: 'q4f16', vision_encoder: 'fp16', decoder_model_merged: 'q4f16' },
    f32: { embed_tokens: 'q4', vision_encoder: 'q4', decoder_model_merged: 'q4' },
  },
});

export const ENGINES = [
  tesseract,
  paddle('paddle-v5', 'PaddleOCR PP-OCRv5 mobile', 'PP-OCRv5_mobile_det', 'PP-OCRv5_mobile_rec', '~15 MB'),
  paddle('paddle-v6', 'PaddleOCR PP-OCRv6 small', 'PP-OCRv6_small_det', 'PP-OCRv6_small_rec', '~30 MB'),
  florence,
  lfm,
  qwen,
];
