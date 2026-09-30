import test from 'node:test';
import assert from 'node:assert/strict';
import { importWinesFromCsv } from './csvImport.js';
import {
  formatWineExportFilename,
  selectWinesForExport,
  serializeWinesAsCsv,
  serializeWinesAsJson,
} from './wineExport.js';

const wine = {
  id: 'wine-1',
  name: 'Červený, "Vlk"\nReserve',
  producer: 'Vinařství, "U řeky"',
  region: 'Malokarpatská',
  country: 'Slovakia',
  type: 'red',
  qty: 2,
  price: 17.5,
  vintage: 2020,
  rating: 4.5,
  grapes: [{ name: 'Frankovka', pct: 100 }],
  alcohol: '13.5',
  cellar: 'Keller 1',
  drinkFrom: '',
  drinkUntil: '',
  notes: 'Aromatic',
  image: '',
  addedAt: new Date('2024-03-04T05:06:07.000Z'),
};

test('serializes empty JSON exports as an empty array', () => {
  assert.equal(serializeWinesAsJson([]), '[]');
});

test('preserves complete wine records, arrays, numbers, special text, and ISO dates in JSON', () => {
  const exported = JSON.parse(serializeWinesAsJson([wine]));

  assert.deepEqual(exported, [{
    ...wine,
    addedAt: '2024-03-04T05:06:07.000Z',
  }]);
  assert.equal(serializeWinesAsJson([wine]), JSON.stringify(exported, null, 2));
});

test('serializes CSV with the required headers and import-compatible values', () => {
  const csv = serializeWinesAsCsv([wine]);
  const [header, row] = csv.split('\r\n');

  assert.equal(header, 'Winery,Wine name,Vintage,Region,Country,Wine type,User cellar count');
  assert.match(row, /^"Vinařství, ""U řeky""","Červený, ""Vlk""\nReserve",2020,Malokarpatská,Slovakia,red,2$/);

  const imported = importWinesFromCsv(csv, [], () => 'imported-id');
  assert.deepEqual(imported.errors, []);
  assert.equal(imported.wines.length, 1);
  assert.equal(imported.wines[0].producer, wine.producer);
  assert.equal(imported.wines[0].name, wine.name);
  assert.equal(imported.wines[0].vintage, wine.vintage);
  assert.equal(imported.wines[0].region, wine.region);
  assert.equal(imported.wines[0].country, wine.country);
  assert.equal(imported.wines[0].type, wine.type);
  assert.equal(imported.wines[0].qty, wine.qty);
});

test('serializes empty and multiple CSV exports without inventing data', () => {
  assert.equal(
    serializeWinesAsCsv([]),
    'Winery,Wine name,Vintage,Region,Country,Wine type,User cellar count',
  );
  const csv = serializeWinesAsCsv([wine, { ...wine, id: 'wine-2', name: 'Second wine', qty: 1 }]);
  assert.equal(csv.split('\r\n').length, 3);
  assert.match(csv, /,Second wine,2020,/);
});

test('selects all, visible, or explicitly selected wines in cellar order', () => {
  const wines = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.deepEqual(selectWinesForExport(wines, 'all', ['b'], ['c']).map(({ id }) => id), ['a', 'b', 'c']);
  assert.deepEqual(selectWinesForExport(wines, 'visible', ['c', 'a'], []).map(({ id }) => id), ['a', 'c']);
  assert.deepEqual(selectWinesForExport(wines, 'selected', [], ['c', 'a']).map(({ id }) => id), ['a', 'c']);
});

test('formats export filenames using the requested format and local calendar date', () => {
  const date = new Date(2026, 8, 30, 23, 59);
  assert.equal(formatWineExportFilename('json', date), 'winecellar-2026-09-30.json');
  assert.equal(formatWineExportFilename('csv', date), 'winecellar-2026-09-30.csv');
});
