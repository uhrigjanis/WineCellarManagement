// Firebase SDK wiring. This module is loaded with a dynamic import() only when a Firebase config is
// present, so the local-only build does not download the SDK.
import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  connectAuthEmulator,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getDocs,
  getDocsFromServer,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  writeBatch,
} from 'firebase/firestore';
import { createFirestoreWineStore } from './wineStore.js';

const POPUP_FALLBACK_ERRORS = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
]);

export function initFirebase({ config, emulator }) {
  const app = initializeApp(config);
  const auth = getAuth(app);

  // Offline-first: Firestore keeps an IndexedDB cache, shared between tabs, and syncs when back online.
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });

  if (emulator) {
    // Default to the host the page was loaded from, so a phone on the same network reaches the emulator.
    const host = emulator.host || window.location.hostname || '127.0.0.1';
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, host, 8080);
  }

  const api = { collection, doc, getDocs, getDocsFromServer, onSnapshot, writeBatch };

  // Surfaces errors from a redirect sign-in (the popup fallback) after the page reloads.
  getRedirectResult(auth).catch((error) => console.error('Sign-in redirect failed', error));

  return {
    emulator: Boolean(emulator),
    onUserChanged: (callback) => onAuthStateChanged(auth, callback),
    async signIn() {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      try {
        await signInWithPopup(auth, provider);
      } catch (error) {
        if (!POPUP_FALLBACK_ERRORS.has(error?.code)) throw error;
        await signInWithRedirect(auth, provider);
      }
    },
    signOut: () => signOut(auth),
    createStore: (uid) => createFirestoreWineStore({ db, uid, api }),
  };
}
