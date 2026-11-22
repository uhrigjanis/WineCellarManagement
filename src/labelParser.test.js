import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLabelLines } from './labelParser.js';

const lines = (...entries) => entries.map(([text, height = 20]) => ({ text, height }));

test('reads a German Riesling label (OCR output from a cursive test label)', () => {
  const result = parseLabelLines(lines(
    ['Hermannshöhle', 22],
    ['Weingut Dönnhoff', 46],
    ['Nahe', 30],
    ['2019', 40],
    ['Riesling Großes Gewächs · 13 % vol', 14],
  ), { currentYear: 2026 });

  assert.deepEqual(result, {
    name: 'Hermannshöhle',
    producer: 'Weingut Dönnhoff',
    vintage: 2019,
    alcohol: '13',
    type: 'white',
    region: 'Nahe',
    country: 'Deutschland',
    grapes: ['Riesling'],
  });
});

test('uses the château as name when nothing else names the wine', () => {
  const result = parseLabelLines(lines(
    ['Grand Vin', 22],
    ['Château Margaux', 46],
    ['Margaux', 30],
    ['2015', 40],
    ['Premier Grand Cru Classé · 13,5 % vol', 14],
    ['Mis en bouteille au château', 12],
  ), { currentYear: 2026 });

  assert.equal(result.producer, 'Château Margaux');
  assert.equal(result.name, 'Château Margaux');
  assert.equal(result.vintage, 2015);
  assert.equal(result.alcohol, '13.5');
  assert.equal(result.region, 'Margaux');
  assert.equal(result.country, 'Frankreich');
});

test('recognises Italian producers, regions and alcohol written as "% vol" on its own', () => {
  const result = parseLabelLines(lines(
    ['Tignanello', 46],
    ['Marchesi', 30],
    ['Antinori', 30],
    ['Toscana', 30],
    ['2017', 40],
    ['Indicazione Geografica Tipica·14 % vol', 14],
  ), { currentYear: 2026 });

  assert.equal(result.name, 'Tignanello');
  assert.equal(result.producer, 'Marchesi Antinori');
  assert.equal(result.region, 'Toscana');
  assert.equal(result.country, 'Italien');
  assert.equal(result.alcohol, '14');
});

test('ignores years that are not vintages and implausible alcohol values', () => {
  const result = parseLabelLines(lines(
    ['Seit 1874 in Familienbesitz', 12],
    ['Spätburgunder Rotwein trocken', 30],
    ['750 ml', 12],
    ['2031', 12],
  ), { currentYear: 2026 });

  assert.equal(result.vintage, undefined);
  assert.equal(result.alcohol, undefined);
  assert.equal(result.type, 'red');
  assert.deepEqual(result.grapes, ['Spätburgunder']);
});

test('detects sparkling wine and producer from bottler lines', () => {
  const result = parseLabelLines(lines(
    ['CHAMPAGNE', 40],
    ['Brut Réserve', 24],
    ['Élaboré par Billecart-Salmon', 12],
    ['12% vol', 12],
  ), { currentYear: 2026 });

  assert.equal(result.type, 'sparkling');
  assert.equal(result.region, 'Champagne');
  assert.equal(result.country, 'Frankreich');
  assert.equal(result.producer, 'Billecart-Salmon');
  assert.equal(result.alcohol, '12');
});

test('returns an empty object when nothing wine-related was read', () => {
  assert.deepEqual(parseLabelLines(lines(['', 10], ['|||', 10])), {});
  assert.deepEqual(parseLabelLines([]), {});
});
