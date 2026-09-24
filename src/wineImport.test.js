import test from 'node:test';
import assert from 'node:assert/strict';
import { importWinesFromJson } from './wineImport.js';

const validWine = {
  name: 'Château Margaux',
  producer: 'Château Margaux',
  region: 'Bordeaux',
  country: 'France',
  style: 'red',
  qty: 12,
  price: 89.99,
  vintage: 2015,
  rating: 4.8,
  grapes: [
    { name: 'Cabernet Sauvignon', pct: 75 },
    { name: 'Merlot', pct: 25 },
  ],
};

test('imports multiple valid wines and maps them to cellar records', () => {
  const result = importWinesFromJson(JSON.stringify([validWine, { ...validWine, name: 'Second Wine' }]), [], () => 'generated-id');

  assert.equal(result.wines.length, 2);
  assert.equal(result.errors.length, 0);
  assert.equal(result.wines[0].id, 'generated-id');
  assert.equal(result.wines[0].type, 'red');
  assert.deepEqual(result.wines[0].grapes, validWine.grapes);
});

test('rejects malformed JSON with an actionable error', () => {
  const result = importWinesFromJson('{not-json}', [], () => 'id');

  assert.equal(result.wines.length, 0);
  assert.match(result.errors[0], /valid JSON/i);
});

test('reports missing fields without importing the invalid entry', () => {
  const incompleteWine = { ...validWine };
  delete incompleteWine.grapes;

  const result = importWinesFromJson(JSON.stringify([incompleteWine]), [], () => 'id');

  assert.equal(result.wines.length, 0);
  assert.match(result.errors[0], /grapes/i);
});

test('skips duplicate entries while preserving existing cellar data', () => {
  const existing = [{ id: 'existing-id', name: validWine.name, producer: validWine.producer, vintage: validWine.vintage }];
  const result = importWinesFromJson(JSON.stringify([validWine]), existing, () => 'new-id');

  assert.deepEqual(result.wines, []);
  assert.equal(result.skipped, 1);
  assert.match(result.messages[0], /duplicate/i);
});

test('reports invalid field types instead of throwing', () => {
  const result = importWinesFromJson(JSON.stringify([{ ...validWine, name: 42 }]), [], () => 'id');

  assert.equal(result.wines.length, 0);
  assert.match(result.errors[0], /text values/i);
});

test('rejects numeric values supplied as strings', () => {
  const result = importWinesFromJson(JSON.stringify([{ ...validWine, qty: '12' }]), [], () => 'id');

  assert.equal(result.wines.length, 0);
  assert.match(result.errors[0], /numeric values/i);
});
