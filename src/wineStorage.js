import { invoke, isTauri } from '@tauri-apps/api/core';
import { createWineRepository } from './wineRepository.js';

export const LEGACY_WINE_STORAGE_KEY = 'weinkeller-wines-v2';
let appRepository;

export function createLocalStorageWineStore(storage = globalThis.localStorage) {
  if (!storage) {
    throw new Error('Browser storage is unavailable.');
  }

  return {
    async loadWines() {
      const stored = storage.getItem(LEGACY_WINE_STORAGE_KEY);
      if (stored === null) return [];

      let wines;
      try {
        wines = JSON.parse(stored);
      } catch (error) {
        throw new Error('Saved wine data is not valid JSON.', { cause: error });
      }
      if (!Array.isArray(wines)) {
        throw new Error('Saved wine data must be an array.');
      }
      return wines;
    },

    async saveWines(wines) {
      storage.setItem(LEGACY_WINE_STORAGE_KEY, JSON.stringify(wines));
    },
  };
}

export async function createTauriWineStore(invokeCommand, legacyStorage = globalThis.localStorage) {
  const legacyData = legacyStorage?.getItem(LEGACY_WINE_STORAGE_KEY);
  let legacyWines;
  if (legacyData !== null && legacyData !== undefined) {
    try {
      legacyWines = JSON.parse(legacyData);
    } catch (error) {
      throw new Error('Saved wine data is not valid JSON and could not be migrated.', { cause: error });
    }
    if (!Array.isArray(legacyWines)) {
      throw new Error('Saved wine data must be an array to be migrated.');
    }
  }

  await invokeCommand(
    'initialize_wine_storage',
    legacyWines === undefined ? {} : { legacyWines },
  );
  return {
    loadWines: () => invokeCommand('load_wines'),
    saveWines: (wines) => invokeCommand('save_wines', { wines }),
  };
}

export function createAppWineRepository() {
  if (!appRepository) {
    appRepository = (async () => {
      if (!isTauri()) {
        return createWineRepository(createLocalStorageWineStore());
      }
      const store = await createTauriWineStore(invoke);
      return createWineRepository(store);
    })().catch((error) => {
      appRepository = undefined;
      throw error;
    });
  }
  return appRepository;
}
