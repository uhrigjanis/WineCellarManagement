import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeCsvFile, importWinesFromCsv, parseCsv } from './csvImport.js';

const sampleCsv = `Winery;Wine name;Vintage;Region;Country;Wine type;User cellar count
Bollinger;La Grande Année Brut Champagne;2014;Champagne;France;Sparkling;1
Magula;Červený Vlk;;Malokarpatská;Slovakia;Red Wine;1`;

test('parses quoted delimiters, escaped quotes, and embedded newlines', () => {
  const result = parseCsv('Name,Notes\n"Wine, red","A ""great"" wine\nfrom France"');

  assert.deepEqual(result.headers, ['Name', 'Notes']);
  assert.deepEqual(result.rows, [['Wine, red', 'A "great" wine\nfrom France']]);
  assert.deepEqual(result.errors, []);
});

test('supports a configurable delimiter and strips a UTF-8 BOM', () => {
  const result = parseCsv('\uFEFFWinery;Wine name\nExample;Wine', ';');

  assert.deepEqual(result.headers, ['Winery', 'Wine name']);
  assert.deepEqual(result.rows, [['Example', 'Wine']]);
  assert.deepEqual(result.errors, []);
});

test('reports malformed quoting and inconsistent row widths', () => {
  const result = parseCsv('Name,Region\nUnclosed",Bordeaux\nOther,Loire,extra');

  assert.equal(result.errors.length, 2);
  assert.match(result.errors[0], /quote/i);
  assert.match(result.errors[1], /columns/i);
});

test('reports a header-only file instead of treating it as an empty successful import', () => {
  const result = importWinesFromCsv('Winery,Name,Region,Country,Type,Count');

  assert.deepEqual(result.wines, []);
  assert.match(result.errors[0], /no wine rows/i);
});

test('maps winery CSV rows to cellar records, including optional and blank values', () => {
  const result = importWinesFromCsv(sampleCsv, [], () => 'generated-id', { delimiter: ';' });

  assert.equal(result.wines.length, 2);
  assert.deepEqual(result.errors, []);
  assert.equal(result.wines[0].id, 'generated-id');
  assert.equal(result.wines[0].name, 'La Grande Année Brut Champagne');
  assert.equal(result.wines[0].producer, 'Bollinger');
  assert.equal(result.wines[0].type, 'sparkling');
  assert.equal(result.wines[0].vintage, 2014);
  assert.equal(result.wines[0].qty, 1);
  assert.equal(result.wines[0].price, 0);
  assert.deepEqual(result.wines[0].grapes, []);
  assert.equal(result.wines[1].vintage, 0);
  assert.equal(result.wines[1].type, 'red');
});

test('maps reordered and custom headers and validates numeric fields', () => {
  const csv = 'Bottles,Alcohol,Year,Winery,Name,Area,Country,Kind,Notes\n'
    + '2,13.5,2021,Producer,Wine,Region,France,White Wine,"Crisp, mineral"';
  const result = importWinesFromCsv(csv, [], () => 'id');

  assert.equal(result.wines.length, 1);
  assert.equal(result.wines[0].qty, 2);
  assert.equal(result.wines[0].alcohol, '13.5');
  assert.equal(result.wines[0].notes, 'Crisp, mineral');
  assert.equal(result.wines[0].type, 'white');

  const invalid = importWinesFromCsv(csv.replace('13.5', '120').replace('2,13.5', '-2,13.5'), [], () => 'id');
  assert.equal(invalid.wines.length, 0);
  assert.equal(invalid.errors.length, 1);
  assert.match(invalid.errors[0], /row 2/i);
});

test('imports 125 records in one batch and keeps valid rows when others fail validation', () => {
  const records = Array.from({ length: 125 }, (_, index) => (
    `Producer ${index};Wine ${index};2020;Region;France;Red Wine;1`
  ));
  const csv = `Winery;Wine name;Vintage;Region;Country;Wine type;User cellar count\n${records.join('\n')}`;
  const batch = importWinesFromCsv(csv, [], (() => {
    let id = 0;
    return () => `wine-${++id}`;
  })());
  assert.equal(batch.wines.length, 125);
  assert.deepEqual(batch.errors, []);

  const partial = importWinesFromCsv(
    'Winery,Name,Vintage,Region,Country,Type,Count\nProducer,Valid,2020,Region,France,Red Wine,1\nProducer,Invalid,2020,Region,France,Unknown,1',
    [],
    () => 'id',
  );
  assert.equal(partial.wines.length, 1);
  assert.match(partial.errors[0], /unsupported wine type/i);

  const corrected = importWinesFromCsv(
    'Winery,Name,Vintage,Region,Country,Type,Count\nProducer,Valid,2020,Region,France,Red Wine,1\nProducer,Fixed,2020,Region,France,Unknown,1',
    [],
    () => 'id',
    { corrections: { 3: { type: 'White Wine' } } },
  );
  assert.equal(corrected.wines.length, 2);
  assert.deepEqual(corrected.errors, []);
  assert.equal(corrected.wines[1].type, 'white');
});

test('allows explicit header mappings and skips existing and in-file duplicates', () => {
  const csv = 'Maker;Title;Year;Place;Nation;Category;Count\n'
    + 'Producer;Wine;2020;Region;France;Rosé;1\n'
    + 'Producer;Wine;2020;Region;France;Rosé;1';
  const existing = [{ name: 'Wine', producer: 'Producer', vintage: 2020 }];
  const mapping = {
    producer: 'Maker',
    name: 'Title',
    vintage: 'Year',
    region: 'Place',
    country: 'Nation',
    type: 'Category',
    qty: 'Count',
  };
  const result = importWinesFromCsv(csv, existing, () => 'id', { delimiter: ';', mapping });

  assert.deepEqual(result.wines, []);
  assert.equal(result.skipped, 2);
});

test('decodes UTF-8 and falls back to legacy single-byte encodings', () => {
  const utf8 = new TextEncoder().encode('Winery\nChâteau');
  const legacy = Uint8Array.from([0x57, 0x69, 0x6e, 0x65, 0x72, 0x79, 0x0a, 0x43, 0x68, 0xe2, 0x74, 0x65, 0x61, 0x75]);

  assert.equal(decodeCsvFile(utf8.buffer), 'Winery\nChâteau');
  assert.equal(decodeCsvFile(legacy.buffer), 'Winery\nChâteau');
});

test('imports the attached semicolon-delimited cellar sample', async () => {
  const { readFile } = await import('node:fs/promises');
  const csv = await readFile(new URL('../examples/cellar.csv', import.meta.url), 'utf8');
  const result = importWinesFromCsv(csv, [], (() => {
    let id = 0;
    return () => `wine-${++id}`;
  })(), { delimiter: ';' });

  assert.equal(result.wines.length, 31);
  assert.deepEqual(result.errors, []);
  assert.equal(result.wines[0].producer, 'Bollinger');
  assert.equal(result.wines[0].vintage, 2014);
  assert.equal(result.wines.find((wine) => wine.name === 'Červený Vlk').vintage, 0);
  assert.equal(result.wines.find((wine) => wine.name === 'Blaufränkisch Kalkstein').qty, 2);
});
