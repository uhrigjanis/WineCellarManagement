import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_WINE_DOC_BYTES,
  STORAGE_KEY,
  createFirestoreWineStore,
  createLocalWineStore,
  diffWines,
  estimateWineBytes,
  isValidDocId,
  migrationKey,
  planMigration,
  toFirestoreWine,
} from './wineStore.js';

const wine = (overrides = {}) => ({
  id: 'w1',
  name: 'Riesling',
  producer: 'Dönnhoff',
  vintage: 2020,
  qty: 2,
  grapes: [{ name: 'Riesling', pct: 100 }],
  image: '',
  ...overrides,
});

const memoryStorage = (initial = {}) => {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    data,
  };
};

// Minimal in-memory stand-in for the Firestore functions the store uses.
const fakeFirestore = (initialDocs = {}) => {
  const docs = new Map(Object.entries(initialDocs));
  const commits = [];
  const listeners = new Set();
  const snapshot = () => ({
    docs: [...docs.entries()].map(([id, data]) => ({ id, data: () => data })),
    metadata: { hasPendingWrites: false, fromCache: false },
  });
  const api = {
    collection: (db, ...segments) => ({ path: segments.join('/') }),
    doc: (collectionRef, id) => ({ path: `${collectionRef.path}/${id}`, id }),
    writeBatch: () => {
      const ops = [];
      return {
        set: (ref, data) => ops.push({ type: 'set', id: ref.id, path: ref.path, data }),
        delete: (ref) => ops.push({ type: 'delete', id: ref.id, path: ref.path }),
        commit: async () => {
          commits.push(ops);
          ops.forEach((op) => (op.type === 'set' ? docs.set(op.id, op.data) : docs.delete(op.id)));
          listeners.forEach((listener) => listener(snapshot()));
        },
      };
    },
    onSnapshot: (ref, options, onNext) => {
      listeners.add(onNext);
      onNext(snapshot());
      return () => listeners.delete(onNext);
    },
    getDocsFromServer: async () => snapshot(),
    getDocs: async () => snapshot(),
  };
  return { api, docs, commits };
};

test('diffWines reports changed, added, and removed wines by reference', () => {
  const a = wine({ id: 'a' });
  const b = wine({ id: 'b' });
  const c = wine({ id: 'c' });
  const bChanged = { ...b, qty: 0 };
  const d = wine({ id: 'd' });

  const { upserts, deletes } = diffWines([a, b, c], [a, bChanged, d]);

  assert.deepEqual(upserts.map((item) => item.id), ['b', 'd']);
  assert.deepEqual(deletes, ['c']);
});

test('diffWines returns nothing for an unchanged list', () => {
  const list = [wine({ id: 'a' }), wine({ id: 'b' })];
  assert.deepEqual(diffWines(list, [...list]), { upserts: [], deletes: [] });
});

test('isValidDocId rejects ids Firestore cannot store', () => {
  assert.equal(isValidDocId('wine-123'), true);
  assert.equal(isValidDocId('8c1f6e1e-6f0b-4a43-9a51-5b8c2f7c2a10'), true);
  assert.equal(isValidDocId(''), false);
  assert.equal(isValidDocId('a/b'), false);
  assert.equal(isValidDocId('.'), false);
  assert.equal(isValidDocId('..'), false);
  assert.equal(isValidDocId('__name__'), false);
  assert.equal(isValidDocId(42), false);
});

test('toFirestoreWine drops undefined values and keeps nested data', () => {
  const stored = toFirestoreWine(wine({ alcohol: undefined, notes: 'fein' }));
  assert.equal('alcohol' in stored, false);
  assert.equal(stored.notes, 'fein');
  assert.deepEqual(stored.grapes, [{ name: 'Riesling', pct: 100 }]);
});

test('estimateWineBytes grows with the image data URL', () => {
  const small = estimateWineBytes(wine());
  const large = estimateWineBytes(wine({ image: `data:image/jpeg;base64,${'A'.repeat(500_000)}` }));
  assert.ok(large - small >= 500_000);
  assert.ok(MAX_WINE_DOC_BYTES < 1024 * 1024);
});

test('planMigration uploads local wines and skips duplicates of the cloud cellar', () => {
  const remote = [wine({ id: 'r1', name: 'Riesling', producer: 'Dönnhoff', vintage: 2020 })];
  const local = [
    wine({ id: 'l1', name: ' riesling ', producer: 'DÖNNHOFF', vintage: 2020 }),
    wine({ id: 'l2', name: 'Spätburgunder', producer: 'Huber', vintage: 2018 }),
  ];

  const plan = planMigration(local, remote, () => 'new-id');

  assert.deepEqual(plan.toUpload.map((item) => item.id), ['l2']);
  assert.equal(plan.skipped, 1);
  assert.deepEqual(plan.tooLarge, []);
});

test('planMigration skips duplicates within the local cellar', () => {
  const local = [wine({ id: 'l1' }), wine({ id: 'l2' })];
  const plan = planMigration(local, [], () => 'new-id');
  assert.deepEqual(plan.toUpload.map((item) => item.id), ['l1']);
  assert.equal(plan.skipped, 1);
});

test('planMigration assigns new ids to invalid or colliding ids', () => {
  let counter = 0;
  const createId = () => `generated-${++counter}`;
  const remote = [wine({ id: 'taken', name: 'Other', producer: 'Other', vintage: 1999 })];
  const local = [
    wine({ id: 'taken', name: 'A' }),
    wine({ id: 'a/b', name: 'B' }),
    wine({ id: undefined, name: 'C' }),
    wine({ id: 'fine', name: 'D' }),
  ];

  const plan = planMigration(local, remote, createId);

  assert.deepEqual(plan.toUpload.map((item) => item.id), ['generated-1', 'generated-2', 'generated-3', 'fine']);
});

test('planMigration reports wines that exceed the document limit', () => {
  const huge = wine({ id: 'huge', name: 'Huge', image: `data:image/jpeg;base64,${'A'.repeat(MAX_WINE_DOC_BYTES)}` });
  const plan = planMigration([huge, wine({ id: 'ok' })], [], () => 'x');
  assert.deepEqual(plan.toUpload.map((item) => item.id), ['ok']);
  assert.deepEqual(plan.tooLarge.map((item) => item.id), ['huge']);
});

test('migrationKey is scoped to the user', () => {
  assert.notEqual(migrationKey('alice'), migrationKey('bob'));
});

test('local store loads, ignores corrupt data, and saves the whole cellar', () => {
  const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify([wine()]) });
  const store = createLocalWineStore(storage);
  assert.deepEqual(store.load(), [wine()]);

  store.save([], [wine({ id: 'w2' })]);
  assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)), [wine({ id: 'w2' })]);

  assert.deepEqual(createLocalWineStore(memoryStorage({ [STORAGE_KEY]: '{oops' })).load(), []);
  assert.deepEqual(createLocalWineStore(memoryStorage({ [STORAGE_KEY]: '{"a":1}' })).load(), []);
  assert.deepEqual(createLocalWineStore(memoryStorage()).load(), []);
});

test('local store subscribe emits the stored wines once', () => {
  const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify([wine()]) });
  const calls = [];
  const unsubscribe = createLocalWineStore(storage).subscribe((wines, status) => calls.push({ wines, status }));
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].wines, [wine()]);
  assert.equal(calls[0].status.pending, false);
  unsubscribe();
});

test('firestore store writes only the changed wines under users/{uid}/wines', async () => {
  const { api, commits } = fakeFirestore();
  const store = createFirestoreWineStore({ db: {}, uid: 'alice', api });
  const a = wine({ id: 'a' });
  const b = wine({ id: 'b' });

  await store.save([], [a, b]);
  await store.save([a, b], [a, { ...b, qty: 5 }]);
  await store.save([a, { ...b, qty: 5 }], [a]);

  assert.deepEqual(commits.map((ops) => ops.map((op) => `${op.type}:${op.path}`)), [
    ['set:users/alice/wines/a', 'set:users/alice/wines/b'],
    ['set:users/alice/wines/b'],
    ['delete:users/alice/wines/b'],
  ]);
});

test('firestore store skips the write when nothing changed', async () => {
  const { api, commits } = fakeFirestore();
  const store = createFirestoreWineStore({ db: {}, uid: 'alice', api });
  const list = [wine()];
  await store.save(list, list);
  assert.equal(commits.length, 0);
});

test('firestore store refuses wines above the document limit', async () => {
  const { api, commits } = fakeFirestore();
  const store = createFirestoreWineStore({ db: {}, uid: 'alice', api });
  const huge = wine({ image: `data:image/jpeg;base64,${'A'.repeat(MAX_WINE_DOC_BYTES)}` });
  await assert.rejects(store.save([], [huge]), /too large/i);
  assert.equal(commits.length, 0);
});

test('firestore store still writes the wines that fit next to an oversized one', async () => {
  const { api, docs } = fakeFirestore();
  const store = createFirestoreWineStore({ db: {}, uid: 'alice', api });
  const huge = wine({ id: 'huge', image: `data:image/jpeg;base64,${'A'.repeat(MAX_WINE_DOC_BYTES)}` });
  await assert.rejects(store.save([], [huge, wine({ id: 'ok' })]), (error) => error.code === 'wine/too-large'
    && error.wines.map((item) => item.id).join() === 'huge');
  assert.deepEqual([...docs.keys()], ['ok']);
});

test('firestore store splits large changes into batches of at most 500 writes', async () => {
  const { api, commits } = fakeFirestore();
  const store = createFirestoreWineStore({ db: {}, uid: 'alice', api });
  const many = Array.from({ length: 1201 }, (_, index) => wine({ id: `w${index}`, name: `W${index}` }));
  await store.save([], many);
  assert.deepEqual(commits.map((ops) => ops.length), [500, 500, 201]);
});

test('firestore store subscribe maps documents and sync status', () => {
  const { api } = fakeFirestore({ a: { name: 'A', id: 'stale' } });
  const store = createFirestoreWineStore({ db: {}, uid: 'alice', api });
  const calls = [];
  store.subscribe((wines, status) => calls.push({ wines, status }));
  assert.deepEqual(calls[0].wines, [{ name: 'A', id: 'a' }]);
  assert.deepEqual(calls[0].status, { pending: false, fromCache: false });
});

test('firestore store migrate uploads new local wines and reports duplicates', async () => {
  const { api, docs } = fakeFirestore({ r1: wine({ id: 'r1' }) });
  const store = createFirestoreWineStore({ db: {}, uid: 'alice', api });
  const local = [wine({ id: 'l1' }), wine({ id: 'l2', name: 'Silvaner', producer: 'Wirsching', vintage: 2021 })];

  const result = await store.migrate(local, () => 'new');

  assert.deepEqual([...docs.keys()].sort(), ['l2', 'r1']);
  assert.deepEqual(result, { uploaded: 1, skipped: 1, tooLarge: [] });
});

test('firestore store migrate falls back to cached documents when the server is unreachable', async () => {
  const { api, docs } = fakeFirestore();
  api.getDocsFromServer = async () => { throw new Error('offline'); };
  const store = createFirestoreWineStore({ db: {}, uid: 'alice', api });
  const result = await store.migrate([wine({ id: 'l1' })], () => 'new');
  assert.equal(result.uploaded, 1);
  assert.deepEqual([...docs.keys()], ['l1']);
});
