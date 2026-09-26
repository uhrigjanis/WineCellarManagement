import test from 'node:test';
import assert from 'node:assert/strict';
import { createWineRepository } from './wineRepository.js';

function createMemoryStore(initialWines = []) {
  let wines = structuredClone(initialWines);

  return {
    async loadWines() {
      return structuredClone(wines);
    },
    async saveWines(nextWines) {
      wines = structuredClone(nextWines);
    },
  };
}

const wine = (id, name = `Wine ${id}`) => ({
  id,
  name,
  producer: 'Test producer',
  vintage: 2020,
});

test('loads an empty cellar and persists wines across repository instances', async () => {
  const store = createMemoryStore();
  const repository = createWineRepository(store);

  assert.deepEqual(await repository.list(), []);
  await repository.create(wine('wine-1'));

  const reopenedRepository = createWineRepository(store);
  assert.deepEqual(await reopenedRepository.list(), [wine('wine-1')]);
});

test('creates, updates, and deletes wines without mutating returned records', async () => {
  const repository = createWineRepository(createMemoryStore());
  const created = await repository.create(wine('wine-1'));

  assert.deepEqual(created, wine('wine-1'));
  created.name = 'Changed outside repository';
  assert.deepEqual(await repository.list(), [wine('wine-1')]);

  assert.deepEqual(await repository.update('wine-1', { name: 'Updated wine' }), {
    ...wine('wine-1'),
    name: 'Updated wine',
  });
  assert.deepEqual(await repository.delete('wine-1'), wine('wine-1', 'Updated wine'));
  assert.deepEqual(await repository.list(), []);
});

test('creates import batches atomically and rejects duplicate IDs in the batch', async () => {
  const store = createMemoryStore([wine('existing')]);
  const repository = createWineRepository(store);

  await assert.rejects(
    repository.createMany([wine('new'), wine('existing')]),
    /already exists/i,
  );
  assert.deepEqual(await repository.list(), [wine('existing')]);

  assert.deepEqual(await repository.createMany([wine('new-1'), wine('new-2')]), [
    wine('new-1'),
    wine('new-2'),
  ]);
});

test('rejects duplicate IDs and updates for missing wines without changing stored data', async () => {
  const repository = createWineRepository(createMemoryStore([wine('wine-1')]));

  await assert.rejects(repository.create(wine('wine-1')), /already exists/i);
  await assert.rejects(repository.update('missing', { name: 'Not saved' }), /not found/i);
  assert.deepEqual(await repository.list(), [wine('wine-1')]);
});

test('serializes concurrent mutations so no writes are lost', async () => {
  const repository = createWineRepository(createMemoryStore());

  await Promise.all([
    repository.create(wine('wine-1')),
    repository.create(wine('wine-2')),
  ]);

  assert.deepEqual(
    (await repository.list()).map(({ id }) => id).sort(),
    ['wine-1', 'wine-2'],
  );
});

test('propagates persistence failures without reporting a successful mutation', async () => {
  const failure = new Error('Storage is unavailable');
  const store = createMemoryStore();
  store.saveWines = async () => {
    throw failure;
  };
  const repository = createWineRepository(store);

  await assert.rejects(repository.create(wine('wine-1')), failure);
  assert.deepEqual(await repository.list(), []);
});

test('rejects records without a stable ID', async () => {
  const repository = createWineRepository(createMemoryStore());

  await assert.rejects(repository.create({ name: 'No ID' }), /ID/i);
  assert.deepEqual(await repository.list(), []);
});
