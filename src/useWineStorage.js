import { useCallback, useEffect, useRef, useState } from 'react';
import { readFirebaseConfig } from './firebaseConfig.js';
import { createLocalWineStore, migrationKey } from './wineStore.js';

const firebaseSettings = readFirebaseConfig(import.meta.env);

// Module-level singletons: React.StrictMode runs effects twice in development, but Firebase must only be
// initialised once and a migration must never run twice in parallel (it would upload duplicates).
let firebasePromise = null;
const loadFirebase = () => {
  firebasePromise ??= import('./firebase.js').then(({ initFirebase }) => initFirebase(firebaseSettings));
  return firebasePromise;
};
const migrationsInFlight = new Set();

const LOCAL_STATUS = { mode: 'local', loading: false, pending: false, fromCache: false };

/**
 * Owns the wine list and persists every change to the active store:
 * - not configured / signed out: localStorage (as before)
 * - signed in: Firestore under users/{uid}/wines, with offline cache and live sync
 *
 * `setWines` accepts a value or an updater function, like React's state setter.
 */
export function useWineStorage({ createId, onMigrated }) {
  const localStoreRef = useRef(null);
  localStoreRef.current ??= createLocalWineStore();
  const localStore = localStoreRef.current;

  const [wines, setWinesState] = useState(() => localStore.load());
  const winesRef = useRef(wines);
  const storeRef = useRef(localStore);
  const onMigratedRef = useRef(onMigrated);
  onMigratedRef.current = onMigrated;

  const [firebase, setFirebase] = useState(null);
  const [user, setUser] = useState(firebaseSettings ? undefined : null); // undefined = auth still loading
  const [status, setStatus] = useState(LOCAL_STATUS);
  const [error, setError] = useState(null);

  const replaceWines = (next) => {
    winesRef.current = next;
    setWinesState(next);
  };

  useEffect(() => {
    if (!firebaseSettings) return undefined;
    let active = true;
    let unsubscribe = () => {};
    loadFirebase()
      .then((services) => {
        if (!active) return;
        setFirebase(services);
        unsubscribe = services.onUserChanged((nextUser) => setUser(nextUser ?? null));
      })
      .catch((loadError) => {
        console.error('Firebase could not be initialised', loadError);
        if (active) {
          setUser(null);
          setError({ kind: 'init', error: loadError });
        }
      });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const uid = user?.uid ?? null;

  useEffect(() => {
    if (!firebase || !uid) {
      storeRef.current = localStore;
      replaceWines(localStore.load());
      setStatus(LOCAL_STATUS);
      return undefined;
    }

    const store = firebase.createStore(uid);
    storeRef.current = store;
    // Start empty until the first snapshot so local-only wines are never diffed into the cloud cellar.
    replaceWines([]);
    setStatus({ mode: 'cloud', loading: true, pending: false, fromCache: false });
    setError(null);
    navigator.storage?.persist?.().catch(() => {});

    let active = true;
    const unsubscribe = store.subscribe(
      (remoteWines, snapshotStatus) => {
        if (!active) return;
        replaceWines(remoteWines);
        setStatus({ mode: 'cloud', loading: false, ...snapshotStatus });
      },
      (snapshotError) => {
        console.error('Cloud sync failed', snapshotError);
        if (active) setError({ kind: 'sync', error: snapshotError });
      },
    );

    const key = migrationKey(uid);
    if (!localStorage.getItem(key) && !migrationsInFlight.has(uid)) {
      const localWines = localStore.load();
      if (!localWines.length) {
        localStorage.setItem(key, new Date().toISOString());
      } else {
        migrationsInFlight.add(uid);
        store.migrate(localWines, createId)
          .then((result) => {
            localStorage.setItem(key, new Date().toISOString());
            onMigratedRef.current?.(result);
          })
          .catch((migrationError) => {
            console.error('Migration failed', migrationError);
            setError({ kind: 'migration', error: migrationError });
          })
          .finally(() => migrationsInFlight.delete(uid));
      }
    }

    return () => {
      active = false;
      unsubscribe();
    };
  }, [firebase, uid, localStore, createId]);

  const setWines = useCallback((update) => {
    const previous = winesRef.current;
    const next = typeof update === 'function' ? update(previous) : update;
    if (next === previous) return;
    replaceWines(next);
    storeRef.current.save(previous, next).catch((saveError) => {
      console.error('Saving failed', saveError);
      setError({ kind: 'save', error: saveError });
    });
  }, []);

  const signIn = useCallback(async () => {
    setError(null);
    try {
      await firebase?.signIn();
    } catch (signInError) {
      if (signInError?.code === 'auth/popup-closed-by-user' || signInError?.code === 'auth/cancelled-popup-request') return;
      console.error('Sign-in failed', signInError);
      setError({ kind: 'auth', error: signInError });
    }
  }, [firebase]);

  const signOut = useCallback(() => firebase?.signOut(), [firebase]);

  return {
    wines,
    setWines,
    cloud: {
      available: Boolean(firebaseSettings),
      emulator: Boolean(firebaseSettings?.emulator),
      ready: Boolean(firebase) && user !== undefined,
      user,
      status,
      error,
      clearError: () => setError(null),
      signIn,
      signOut,
    },
  };
}
