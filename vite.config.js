import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Label scanning: the ONNX Runtime WASM files must match the installed onnxruntime-web version
// (PaddleOCR would otherwise fall back to an older pinned CDN version inside its worker).
const ortVersion = JSON.parse(
  readFileSync(new URL('./node_modules/onnxruntime-web/package.json', import.meta.url), 'utf8'),
).version;

// Firebase Emulator Suite (npm run dev:emulator): the app talks to the emulators through the dev server,
// so only port 5173 has to be reachable. This works on localhost, from a phone on the LAN, and behind
// HTTPS port forwarding such as GitHub Codespaces (*.app.github.dev), where the emulator ports would
// otherwise be on different origins and mixed content (http) would be blocked.
const authEmulator = { target: 'http://127.0.0.1:9099', xfwd: true };
const firestoreEmulator = { target: 'http://127.0.0.1:8080', xfwd: true };
const emulatorProxy = {
  '/identitytoolkit.googleapis.com': authEmulator,
  '/securetoken.googleapis.com': authEmulator,
  '/emulator': authEmulator,
  '/google.firestore.v1.Firestore': firestoreEmulator,
};

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
    proxy: emulatorProxy,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: ['.app.github.dev'],
    proxy: emulatorProxy,
  },
});
