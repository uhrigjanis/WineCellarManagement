import test from 'node:test';
import assert from 'node:assert/strict';
import {
  diffWines,
  getWineSize,
  isValidDocId,
  keepWineOrder,
  planBatches,
  planMigration,
  toStoredWine,
} from './wineSync.js';

const wine = (id, name, extra = {}) => ({ id, name, producer: 'Producer', vintage: 2020, qty: 1, ...extra });

test('diffWines finds added, changed, and deleted wines', () => {
  const unchanged = wine('a', 'Alpha');
  const previous = [unchanged, wine('b', 'Beta'), wine('c', 'Gamma')];
  const next = [unchanged, wine('b', 'Beta', { qty: 0 }), wine('d', 'Delta')];

  const { upserts, deletes } = diffWines(previous, next);

  assert.deepEqual(upserts.map((item) => item.id), ['b', 'd']);
  assert.deepEqual(deletes, ['c']);
});

test('diffWines ignores copies with identical content', () => {
  const previous = [wine('a', 'Alpha', { grapes: [{ name: 'Riesling', pct: 100 }] })];
  const next = [structuredClone(previous[0])];

  assert.deepEqual(diffWines(previous, next), { upserts: [], deletes: [] });
});

test('planMigration skips duplicates and keeps valid ids', () => {
  const cloud = [wine('cloud-1', 'Alpha')];
  const local = [
    wine('local-1', ' alpha '),
    wine('local-2', 'Beta'),
    wine('local-3', 'beta'),
  ];

  const uploads = planMigration(local, cloud, () => 'new-id');

  assert.deepEqual(uploads.map((item) => [item.id, item.name]), [['local-2', 'Beta']]);
});

test('planMigration replaces invalid or colliding ids', () => {
  let counter = 0;
  const createId = () => `new-${++counter}`;
  const cloud = [wine('taken', 'Alpha')];
  const local = [wine('taken', 'Beta'), wine('a/b', 'Gamma'), wine('', 'Delta')];

  const uploads = planMigration(local, cloud, createId);

  assert.deepEqual(uploads.map((item) => item.id), ['new-1', 'new-2', 'new-3']);
});

test('isValidDocId rejects ids Firestore does not accept', () => {
  assert.equal(isValidDocId('3f1c-uuid'), true);
  assert.equal(isValidDocId('wine-1'), true);
  assert.equal(isValidDocId(''), false);
  assert.equal(isValidDocId('a/b'), false);
  assert.equal(isValidDocId('..'), false);
  assert.equal(isValidDocId('__name__'), false);
  assert.equal(isValidDocId(42), false);
});

test('keepWineOrder keeps existing positions and puts new wines first', () => {
  const current = [wine('b', 'Beta'), wine('a', 'Alpha')];
  const remote = [wine('a', 'Alpha'), wine('b', 'Beta'), wine('c', 'Gamma')];

  assert.deepEqual(keepWineOrder(current, remote).map((item) => item.id), ['c', 'b', 'a']);
});

test('toStoredWine drops undefined values and serializes dates', () => {
  const stored = toStoredWine({ id: 'a', notes: undefined, addedAt: new Date('2024-01-02T03:04:05.000Z') });

  assert.deepEqual(stored, { id: 'a', addedAt: '2024-01-02T03:04:05.000Z' });
});

test('getWineSize counts UTF-8 bytes', () => {
  assert.equal(getWineSize({ name: 'ä' }), JSON.stringify({ name: 'ä' }).length + 1);
});

test('planBatches respects the write count limit', () => {
  const upserts = [wine('a', 'A'), wine('b', 'B'), wine('c', 'C')];

  const batches = planBatches({ upserts, deletes: ['x'] }, { maxWrites: 2 });

  assert.deepEqual(
    batches.map((batch) => batch.map((write) => write.wine?.id ?? write.id)),
    [['a', 'b'], ['c', 'x']],
  );
});

test('planBatches respects the size limit', () => {
  const image = 'x'.repeat(400);
  const upserts = [wine('a', 'A', { image }), wine('b', 'B', { image }), wine('c', 'C')];

  const batches = planBatches({ upserts }, { maxBytes: 1000 });

  assert.deepEqual(batches.map((batch) => batch.map((write) => write.wine.id)), [['a', 'b'], ['c']]);
});

test('planBatches returns no batches when nothing changed', () => {
  assert.deepEqual(planBatches({ upserts: [], deletes: [] }), []);
});
