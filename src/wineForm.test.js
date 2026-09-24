import test from 'node:test';
import assert from 'node:assert/strict';
import { getWineFormError } from './wineForm.js';

test('reports missing required wine fields instead of silently refusing to save', () => {
  assert.match(getWineFormError({ name: 'Cabernet', producer: '', region: '' }), /producer, region/i);
  assert.equal(getWineFormError({ name: 'Cabernet', producer: 'Winery', region: 'Bordeaux' }), '');
});
