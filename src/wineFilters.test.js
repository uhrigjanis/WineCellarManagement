import test from 'node:test';
import assert from 'node:assert/strict';
import { filterWines, getWineFilterOptions } from './wineFilters.js';

const wines = [
  {
    name: 'Estate Cabernet',
    producer: 'Northstar Winery',
    country: 'France',
    region: 'Bordeaux',
    vintage: 2018,
    type: 'red',
    grapes: [{ name: 'Cabernet Sauvignon' }, { name: 'Merlot' }],
  },
  {
    name: 'Riesling',
    producer: 'Rheingold',
    country: 'Germany',
    region: 'Rheingau',
    vintage: 2020,
    type: 'white',
    grapes: ['Riesling'],
  },
  {
    name: 'Cabernet Reserve',
    producer: 'South Cellars',
    country: 'France',
    region: 'Bordeaux',
    vintage: 2018,
    type: 'red',
    grapes: [{ name: 'Cabernet Sauvignon' }],
  },
];

test('combines text, type, and all wine metadata filters', () => {
  assert.deepEqual(
    filterWines(wines, {
      search: 'cabernet',
      type: 'red',
      country: 'France',
      producer: 'Northstar Winery',
      grape: 'Cabernet Sauvignon',
      region: 'Bordeaux',
      vintage: '2018',
    }),
    [wines[0]],
  );
});

test('matches filter values without case or surrounding-space differences', () => {
  assert.deepEqual(
    filterWines(wines, { country: ' france ', region: 'BORDEAUX', grape: ' merlot ' }),
    [wines[0]],
  );
});

test('supports wines without optional metadata and leaves them visible when filters are inactive', () => {
  const incompleteWine = { name: 'Unclassified wine', producer: 'Unknown', type: 'red' };

  assert.deepEqual(filterWines([incompleteWine], {}), [incompleteWine]);
  assert.deepEqual(filterWines([incompleteWine], { country: 'France' }), []);
});

test('returns distinct, sorted choices for each metadata filter', () => {
  assert.deepEqual(getWineFilterOptions(wines), {
    country: ['France', 'Germany'],
    producer: ['Northstar Winery', 'Rheingold', 'South Cellars'],
    grape: ['Cabernet Sauvignon', 'Merlot', 'Riesling'],
    region: ['Bordeaux', 'Rheingau'],
    vintage: ['2018', '2020'],
  });
});
