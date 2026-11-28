import test from 'node:test';
import assert from 'node:assert/strict';
import { suggestGrapes } from './grapeVarieties.js';

test('returns nothing for an empty query', () => {
  assert.deepEqual(suggestGrapes(''), []);
  assert.deepEqual(suggestGrapes('   '), []);
});

test('ignores case, accents and umlauts', () => {
  assert.equal(suggestGrapes('gruner')[0], 'Grüner Veltliner');
  assert.equal(suggestGrapes('spat')[0], 'Spätburgunder');
  assert.equal(suggestGrapes('RIES')[0], 'Riesling');
  assert.ok(suggestGrapes('semi').includes('Sémillon'));
  assert.ok(suggestGrapes('weiss').includes('Weißburgunder'));
});

test('ranks matches at the start of a word before matches inside the name', () => {
  const results = suggestGrapes('sauv');
  assert.deepEqual(results.slice(0, 2), ['Sauvignon Blanc', 'Cabernet Sauvignon']);

  const inside = suggestGrapes('lot');
  assert.equal(inside[0], 'Merlot');
});

test('finds synonyms in both directions', () => {
  assert.deepEqual(suggestGrapes('pinot noir'), ['Pinot Noir', 'Spätburgunder']);
  assert.ok(suggestGrapes('spatburgunder').includes('Pinot Noir'));
  assert.ok(suggestGrapes('shiraz').includes('Syrah'));
  assert.ok(suggestGrapes('blaufrankisch').includes('Lemberger'));
});

test('finds aliases of a grape', () => {
  assert.ok(suggestGrapes('sylvaner').includes('Silvaner'));
});

test('suggests grapes already stored in the cellar', () => {
  assert.ok(suggestGrapes('saper', ['Saperavi']).includes('Saperavi'));
});

test('does not duplicate a stored grape that differs only in spelling', () => {
  const results = suggestGrapes('pinot n', ['pinot noir', 'Pinot  Noir']);
  assert.deepEqual(results.filter((name) => name.toLowerCase().replace(/\s+/g, ' ') === 'pinot noir'), ['Pinot Noir']);
});

test('hides a suggestion identical to what was typed', () => {
  assert.ok(!suggestGrapes('Merlot').includes('Merlot'));
  assert.ok(suggestGrapes('merlot').includes('Merlot'));
});

test('limits the number of suggestions', () => {
  assert.equal(suggestGrapes('e', [], { limit: 5 }).length, 5);
  assert.ok(suggestGrapes('e').length <= 8);
});

test('returns nothing when no grape matches, so free text stays possible', () => {
  assert.deepEqual(suggestGrapes('xyz'), []);
});
