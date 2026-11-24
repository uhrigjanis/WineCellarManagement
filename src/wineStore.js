// Storage backends for the wine cellar.
//
// Both stores share the same shape:
//   subscribe(onWines, onError) -> unsubscribe   emits the full wine list + { pending, fromCache }
//   save(previousWines, nextWines) -> Promise     persists the change from previous to next
//
// The Firestore store receives the Firestore functions it needs (`api`) instead of importing the SDK,
// so it can be unit-tested with a fake and the SDK is only loaded when cloud sync is configured.

export const STORAGE_KEY = 'weinkeller-wines-v2';

// Firestore documents are limited to 1 MiB (1,048,576 bytes). Keep a margin for field names and overhead.
export const MAX_WINE_DOC_BYTES = 1_000_000;

// Firestore allows at most 500 writes per batch.
const MAX_BATCH_WRITES = 500;

export const migrationKey = (uid) => `weinkeller-migrated-${uid}`;

export const wineDuplicateKey = (wine) => [wine.name, wine.producer, wine.vintage]
  .map((value) => String(value ?? '').trim().toLowerCase())
  .join('|');

export function isValidDocId(id) {
  return typeof id === 'string'
    && id.length > 0
    && id.length <= 1500
    && !id.includes('/')
    && id !== '.'
    && id !== '..'
    && !/^__.*__$/.test(id);
}

// Firestore rejects `undefined` values; a JSON round trip removes them (and turns Dates into ISO strings,
// matching the JSON export format).
export function toFirestoreWine(wine) {
  return JSON.parse(JSON.stringify(wine));
}

export function estimateWineBytes(wine) {
  return new TextEncoder().encode(JSON.stringify(wine)).length;
}

export const isWineTooLarge = (wine) => estimateWineBytes(wine) > MAX_WINE_DOC_BYTES;

// The app updates wines immutably, so an unchanged wine keeps its object identity.
export function diffWines(previousWines, nextWines) {
  const previousById = new Map(previousWines.map((wine) => [wine.id, wine]));
  const nextIds = new Set(nextWines.map((wine) => wine.id));
  const upserts = nextWines.filter((wine) => previousById.get(wine.id) !== wine);
  const deletes = previousWines.filter((wine) => !nextIds.has(wine.id)).map((wine) => wine.id);
  return { upserts, deletes };
}

export function planMigration(localWines, remoteWines, createId) {
  const knownKeys = new Set(remoteWines.map(wineDuplicateKey));
  const usedIds = new Set(remoteWines.map((wine) => wine.id));
  const toUpload = [];
  const tooLarge = [];
  let skipped = 0;

  localWines.forEach((wine) => {
    const key = wineDuplicateKey(wine);
    if (knownKeys.has(key)) {
      skipped += 1;
      return;
    }
    knownKeys.add(key);

    if (isWineTooLarge(wine)) {
      tooLarge.push(wine);
      return;
    }

    let id = wine.id;
    while (!isValidDocId(id) || usedIds.has(id)) id = createId();
    usedIds.add(id);
    toUpload.push(id === wine.id ? wine : { ...wine, id });
  });

  return { toUpload, skipped, tooLarge };
}

export function createLocalWineStore(storage = globalThis.localStorage) {
  const load = () => {
    const stored = storage.getItem(STORAGE_KEY);
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  return {
    kind: 'local',
    load,
    subscribe(onWines) {
      onWines(load(), { pending: false, fromCache: false });
      return () => {};
    },
    async save(previousWines, nextWines) {
      storage.setItem(STORAGE_KEY, JSON.stringify(nextWines));
    },
  };
}

export function createFirestoreWineStore({ db, uid, api }) {
  const winesRef = api.collection(db, 'users', uid, 'wines');

  // Writes everything that fits; wines above the document limit are reported afterwards so that one
  // oversized label image does not block the rest of an import.
  const commitChanges = async (allUpserts, deletes) => {
    const tooLarge = allUpserts.filter(isWineTooLarge);
    const upserts = allUpserts.filter((wine) => !tooLarge.includes(wine));

    const writes = [
      ...upserts.map((wine) => (batch) => batch.set(api.doc(winesRef, wine.id), toFirestoreWine(wine))),
      ...deletes.map((id) => (batch) => batch.delete(api.doc(winesRef, id))),
    ];

    for (let start = 0; start < writes.length; start += MAX_BATCH_WRITES) {
      const batch = api.writeBatch(db);
      writes.slice(start, start + MAX_BATCH_WRITES).forEach((write) => write(batch));
      // Offline, commit() only resolves once the server confirmed the write; the change is applied to the
      // local cache (and every snapshot listener) immediately.
      await batch.commit();
    }

    if (tooLarge.length) {
      const error = new Error(`Wine too large for cloud storage (max. ${MAX_WINE_DOC_BYTES} bytes): ${tooLarge.map((wine) => wine.name).join(', ')}`);
      error.code = 'wine/too-large';
      error.wines = tooLarge;
      throw error;
    }
  };

  const readDocs = (snapshot) => snapshot.docs.map((docSnapshot) => ({ ...docSnapshot.data(), id: docSnapshot.id }));

  return {
    kind: 'firestore',
    uid,
    subscribe(onWines, onError) {
      return api.onSnapshot(
        winesRef,
        { includeMetadataChanges: true },
        (snapshot) => onWines(readDocs(snapshot), {
          pending: snapshot.metadata.hasPendingWrites,
          fromCache: snapshot.metadata.fromCache,
        }),
        onError,
      );
    },
    async save(previousWines, nextWines) {
      const { upserts, deletes } = diffWines(previousWines, nextWines);
      if (!upserts.length && !deletes.length) return;
      await commitChanges(upserts, deletes);
    },
    async migrate(localWines, createId) {
      let remote;
      try {
        remote = await api.getDocsFromServer(winesRef);
      } catch {
        remote = await api.getDocs(winesRef);
      }
      const plan = planMigration(localWines, readDocs(remote), createId);
      if (plan.toUpload.length) await commitChanges(plan.toUpload, []);
      return { uploaded: plan.toUpload.length, skipped: plan.skipped, tooLarge: plan.tooLarge.map((wine) => wine.name) };
    },
  };
}
