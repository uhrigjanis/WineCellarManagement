// Reads the Firebase web config from Vite env vars (VITE_FIREBASE_*). The web config is not secret:
// access to the data is protected by the Firestore security rules (firestore.rules).

const ENV_KEYS = {
  apiKey: 'VITE_FIREBASE_API_KEY',
  authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
  projectId: 'VITE_FIREBASE_PROJECT_ID',
  storageBucket: 'VITE_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'VITE_FIREBASE_APP_ID',
};

const REQUIRED = ['apiKey', 'authDomain', 'projectId', 'appId'];

// Local Firebase Emulator Suite. A `demo-` project id never touches a real Firebase project.
const EMULATOR_DEFAULTS = {
  apiKey: 'demo-api-key',
  authDomain: 'demo-weinkeller.firebaseapp.com',
  projectId: 'demo-weinkeller',
  appId: 'demo-app-id',
};

const isTrue = (value) => ['1', 'true', 'yes'].includes(String(value ?? '').trim().toLowerCase());

// Returns { config, emulator } or null when cloud sync is not configured (local-only mode).
export function readFirebaseConfig(env = {}) {
  const config = {};
  Object.entries(ENV_KEYS).forEach(([field, key]) => {
    const value = String(env[key] ?? '').trim();
    if (value) config[field] = value;
  });

  const useEmulator = isTrue(env.VITE_FIREBASE_USE_EMULATOR);
  if (useEmulator) {
    return {
      config: { ...EMULATOR_DEFAULTS, ...config },
      emulator: { host: String(env.VITE_FIREBASE_EMULATOR_HOST ?? '').trim() || null },
    };
  }

  if (REQUIRED.some((field) => !config[field])) return null;
  return { config, emulator: null };
}
