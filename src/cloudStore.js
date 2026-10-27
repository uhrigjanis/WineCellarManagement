import { planBatches, toStoredWine } from './wineSync.js';

const env = import.meta.env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

export const isCloudConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId,
);

let servicesPromise = null;

// Firebase is loaded on demand so the app starts fast and still works without it.
const loadServices = () => {
  if (!servicesPromise) {
    servicesPromise = (async () => {
      const [{ initializeApp }, authModule, firestoreModule] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
        import('firebase/firestore'),
      ]);
      const app = initializeApp(firebaseConfig);
      const auth = authModule.getAuth(app);

      let db;
      try {
        // Keep a copy of the cellar in IndexedDB so the app works offline and syncs later.
        db = firestoreModule.initializeFirestore(app, {
          ignoreUndefinedProperties: true,
          localCache: firestoreModule.persistentLocalCache({
            tabManager: firestoreModule.persistentMultipleTabManager(),
          }),
        });
      } catch {
        db = firestoreModule.initializeFirestore(app, { ignoreUndefinedProperties: true });
      }

      if (env.VITE_FIREBASE_EMULATOR === 'true') {
        authModule.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
        firestoreModule.connectFirestoreEmulator(db, '127.0.0.1', 8080);
      }

      return { auth, authModule, db, fs: firestoreModule };
    })();
  }
  return servicesPromise;
};

const winesCollection = ({ fs, db }, uid) => fs.collection(db, 'users', uid, 'wines');

export async function watchUser(callback) {
  const { auth, authModule } = await loadServices();
  return authModule.onAuthStateChanged(auth, (user) => callback(user ? { uid: user.uid, email: user.email } : null));
}

export async function signIn() {
  const { auth, authModule } = await loadServices();
  const provider = new authModule.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await authModule.signInWithPopup(auth, provider);
  } catch (error) {
    if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/operation-not-supported-in-this-environment') {
      await authModule.signInWithRedirect(auth, provider);
      return;
    }
    throw error;
  }
}

export async function signOut() {
  const { auth, authModule } = await loadServices();
  await authModule.signOut(auth);
}

// Calls onChange with { wines, changed, pending, fromCache } for every update, including sync-state changes.
export async function watchWines(uid, onChange, onError) {
  const services = await loadServices();
  return services.fs.onSnapshot(
    winesCollection(services, uid),
    { includeMetadataChanges: true },
    (snapshot) => onChange({
      wines: snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })),
      changed: snapshot.docChanges().length > 0,
      pending: snapshot.metadata.hasPendingWrites,
      fromCache: snapshot.metadata.fromCache,
    }),
    onError,
  );
}

export async function fetchWinesFromServer(uid) {
  const services = await loadServices();
  const snapshot = await services.fs.getDocsFromServer(winesCollection(services, uid));
  return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
}

// Resolves once the server has confirmed the writes. Offline writes stay queued until then.
export async function saveWineChanges(uid, changes) {
  const services = await loadServices();
  const { fs, db } = services;
  const collection = winesCollection(services, uid);

  await Promise.all(planBatches(changes).map((writes) => {
    const batch = fs.writeBatch(db);
    writes.forEach((write) => {
      if (write.type === 'set') {
        batch.set(fs.doc(collection, write.wine.id), toStoredWine(write.wine));
      } else {
        batch.delete(fs.doc(collection, write.id));
      }
    });
    return batch.commit();
  }));
}
