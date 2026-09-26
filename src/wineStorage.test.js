import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createLocalStorageWineStore,
  createTauriWineStore,
  LEGACY_WINE_STORAGE_KEY,
} from './wineStorage.js';

function createMemoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
  };
}

const wines = [
  { id: 'wine-1', name: 'First wine' },
  { id: 'wine-2', name: 'Second wine' },
];

test('persists browser wines and reports malformed stored data', async () => {
  const storage = createMemoryStorage();
  const store = createLocalStorageWineStore(storage);

  assert.deepEqual(await store.loadWines(), []);
  await store.saveWines(wines);
  assert.deepEqual(await store.loadWines(), wines);

  storage.setItem(LEGACY_WINE_STORAGE_KEY, '{bad json');
  await assert.rejects(store.loadWines(), /not valid JSON/i);
});

test('initializes the Tauri SQLite database and migrates legacy browser data once', async () => {
  const storage = createMemoryStorage({
    [LEGACY_WINE_STORAGE_KEY]: JSON.stringify(wines),
  });
  const calls = [];
  let persistedWines = [];
  let initialized = false;
  const invoke = async (command, args) => {
    calls.push({ command, args });
    if (command === 'initialize_wine_storage') {
      if (!initialized) persistedWines = args.legacyWines || [];
      initialized = true;
    }
    if (command === 'load_wines') return structuredClone(persistedWines);
    if (command === 'save_wines') persistedWines = structuredClone(args.wines);
  };

  const store = await createTauriWineStore(invoke, storage);
  assert.deepEqual(await store.loadWines(), wines);
  assert.equal(storage.getItem(LEGACY_WINE_STORAGE_KEY), JSON.stringify(wines));

  await store.saveWines([wines[1]]);
  await createTauriWineStore(invoke, createMemoryStorage());
  assert.deepEqual(await store.loadWines(), [wines[1]]);
  assert.deepEqual(calls.map(({ command }) => command), [
    'initialize_wine_storage',
    'load_wines',
    'save_wines',
    'initialize_wine_storage',
    'load_wines',
  ]);
});

test('does not initialize the native store with invalid legacy data', async () => {
  let invoked = false;
  const invoke = async () => {
    invoked = true;
  };
  const storage = createMemoryStorage({
    [LEGACY_WINE_STORAGE_KEY]: '{bad json',
  });

  await assert.rejects(createTauriWineStore(invoke, storage), /not valid JSON/i);
  assert.equal(invoked, false);
});

test('surfaces native storage command failures', async () => {
  const failure = new Error('SQLite is unavailable');

  await assert.rejects(
    createTauriWineStore(async () => {
      throw failure;
    }, createMemoryStorage()),
    failure,
  );
});
