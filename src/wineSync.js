import { duplicateKey } from './wineImport.js';

// Firestore rejects documents over 1 MiB; keep some room for field names and overhead.
export const MAX_WINE_BYTES = 1_000_000;

// Firestore allows at most 500 writes and about 10 MiB per batch.
export const MAX_BATCH_WRITES = 500;
export const MAX_BATCH_BYTES = 9_000_000;

// Firestore only stores plain values: drop undefined fields and turn dates into ISO strings.
export const toStoredWine = (wine) => JSON.parse(JSON.stringify(wine));

export const getWineSize = (wine) => new TextEncoder().encode(JSON.stringify(wine)).length;

export const isValidDocId = (id) => typeof id === 'string'
  && id.length > 0
  && id.length <= 1500
  && !id.includes('/')
  && id !== '.'
  && id !== '..'
  && !/^__.*__$/.test(id);

const isSameWine = (left, right) => left === right || JSON.stringify(left) === JSON.stringify(right);

// Work out which documents must be written or deleted to turn `previous` into `next`.
export function diffWines(previous, next) {
  const previousById = new Map(previous.map((wine) => [wine.id, wine]));
  const nextIds = new Set(next.map((wine) => wine.id));

  const upserts = next.filter((wine) => {
    const before = previousById.get(wine.id);
    return !before || !isSameWine(before, wine);
  });
  const deletes = previous.filter((wine) => !nextIds.has(wine.id)).map((wine) => wine.id);

  return { upserts, deletes };
}

// Pick the local wines that should be uploaded on sign-in, skipping ones the cloud already has.
export function planMigration(localWines, cloudWines, createId) {
  const knownKeys = new Set(cloudWines.map(duplicateKey));
  const usedIds = new Set(cloudWines.map((wine) => wine.id));
  const uploads = [];

  for (const wine of localWines) {
    const key = duplicateKey(wine);
    if (knownKeys.has(key)) continue;
    knownKeys.add(key);

    const id = isValidDocId(wine.id) && !usedIds.has(wine.id) ? wine.id : createId();
    usedIds.add(id);
    uploads.push({ ...wine, id });
  }

  return uploads;
}

// Keep the on-screen order stable: known wines stay where they were, new ones go first.
export function keepWineOrder(currentWines, remoteWines) {
  const position = new Map(currentWines.map((wine, index) => [wine.id, index]));
  const added = remoteWines.filter((wine) => !position.has(wine.id));
  const known = remoteWines
    .filter((wine) => position.has(wine.id))
    .sort((left, right) => position.get(left.id) - position.get(right.id));
  return [...added, ...known];
}

// Split writes into batches that stay under Firestore's count and size limits.
export function planBatches({ upserts = [], deletes = [] }, limits = {}) {
  const maxWrites = limits.maxWrites ?? MAX_BATCH_WRITES;
  const maxBytes = limits.maxBytes ?? MAX_BATCH_BYTES;
  const writes = [
    ...upserts.map((wine) => ({ type: 'set', wine, size: getWineSize(wine) })),
    ...deletes.map((id) => ({ type: 'delete', id, size: id.length })),
  ];
  const batches = [];
  let current = [];
  let currentBytes = 0;

  for (const write of writes) {
    if (current.length && (current.length >= maxWrites || currentBytes + write.size > maxBytes)) {
      batches.push(current);
      current = [];
      currentBytes = 0;
    }
    current.push(write);
    currentBytes += write.size;
  }
  if (current.length) batches.push(current);

  return batches;
}
