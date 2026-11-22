import test from 'node:test';
import assert from 'node:assert/strict';
import { matchField, scoreResult } from './score.js';

test('matches ignoring accents, case and punctuation', () => {
  assert.equal(matchField('Château Margaux', 'GRAND VIN\nCHATEAU MARGAUX\n2015'), true);
  assert.equal(matchField('Weingut Dönnhoff', 'weingut donnhoff - nahe'), true);
});

test('tolerates small OCR errors but not unrelated text', () => {
  assert.equal(matchField('Château Margaux', 'Chateau Margavx premier'), true);
  assert.equal(matchField('Château Margaux', 'Domaine Leflaive Puligny'), false);
});

test('vintages must match exactly', () => {
  assert.equal(matchField('2015', 'Margaux 2016'), false);
  assert.equal(matchField('2015', 'Margaux 2015'), true);
});

test('empty expectations are not counted', () => {
  const result = scoreResult({ name: 'Riesling', vintage: '' }, 'Riesling Kabinett');
  assert.deepEqual(result, {
    fields: { name: true, producer: null, vintage: null, region: null },
    hits: 1,
    total: 1,
  });
});
