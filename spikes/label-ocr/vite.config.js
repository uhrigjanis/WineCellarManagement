import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// Locally: self-signed HTTPS so phones on the LAN get a secure context (required for WebGPU).
// In GitHub Codespaces the forwarded port is already HTTPS and proxies to plain HTTP,
// so the dev server must stay on HTTP there.
const inCodespace = process.env.CODESPACES === 'true';

export default defineConfig({
  plugins: inCodespace ? [] : [basicSsl()],
  server: {
    allowedHosts: ['.app.github.dev'],
  },
  build: { target: 'es2022' },
  esbuild: { target: 'es2022' },
  optimizeDeps: {
    exclude: ['@huggingface/transformers', 'onnxruntime-web'],
    esbuildOptions: { target: 'es2022' },
  },
  worker: { format: 'es' },
});
