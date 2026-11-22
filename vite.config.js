import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Label scanning: the ONNX Runtime WASM files must match the installed onnxruntime-web version
// (PaddleOCR would otherwise fall back to an older pinned CDN version inside its worker).
const ortVersion = JSON.parse(
  readFileSync(new URL('./node_modules/onnxruntime-web/package.json', import.meta.url), 'utf8'),
).version;

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
  define: {
    __ORT_WASM_PATH__: JSON.stringify(`https://cdn.jsdelivr.net/npm/onnxruntime-web@${ortVersion}/dist/`),
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['.app.github.dev'], // GitHub Codespaces port forwarding
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: ['.app.github.dev'],
  },
});
