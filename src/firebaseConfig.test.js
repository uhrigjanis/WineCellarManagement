import test from 'node:test';
import assert from 'node:assert/strict';
import { readFirebaseConfig } from './firebaseConfig.js';

const fullEnv = {
  VITE_FIREBASE_API_KEY: 'key',
  VITE_FIREBASE_AUTH_DOMAIN: 'weinkeller.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'weinkeller',
  VITE_FIREBASE_STORAGE_BUCKET: 'weinkeller.appspot.com',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '123',
  VITE_FIREBASE_APP_ID: '1:123:web:abc',
};

test('readFirebaseConfig returns null without config (local-only mode)', () => {
  assert.equal(readFirebaseConfig({}), null);
  assert.equal(readFirebaseConfig(), null);
});

test('readFirebaseConfig returns null when a required value is missing or blank', () => {
  assert.equal(readFirebaseConfig({ ...fullEnv, VITE_FIREBASE_API_KEY: '  ' }), null);
  const { VITE_FIREBASE_APP_ID, ...withoutAppId } = fullEnv;
  assert.equal(readFirebaseConfig(withoutAppId), null);
});

test('readFirebaseConfig maps all env vars to the firebaseConfig fields', () => {
  assert.deepEqual(readFirebaseConfig(fullEnv), {
    config: {
      apiKey: 'key',
      authDomain: 'weinkeller.firebaseapp.com',
      projectId: 'weinkeller',
      storageBucket: 'weinkeller.appspot.com',
      messagingSenderId: '123',
      appId: '1:123:web:abc',
    },
    emulator: null,
  });
});

test('readFirebaseConfig uses a demo project for the emulator', () => {
  const result = readFirebaseConfig({ VITE_FIREBASE_USE_EMULATOR: 'true' });
  assert.equal(result.config.projectId, 'demo-weinkeller');
  assert.deepEqual(result.emulator, { host: null });
});

test('readFirebaseConfig keeps an explicit emulator host and project', () => {
  const result = readFirebaseConfig({
    VITE_FIREBASE_USE_EMULATOR: '1',
    VITE_FIREBASE_EMULATOR_HOST: '192.168.1.20',
    VITE_FIREBASE_PROJECT_ID: 'demo-other',
  });
  assert.equal(result.config.projectId, 'demo-other');
  assert.equal(result.emulator.host, '192.168.1.20');
});
