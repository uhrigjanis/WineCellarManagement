import test from 'node:test';
import assert from 'node:assert/strict';
import { extractWineSuggestions, isMobileDevice, scanWineLabel } from './wineScan.js';

test('allows scanning on iOS and Android user agents but not desktop', () => {
  assert.equal(isMobileDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'), true);
  assert.equal(isMobileDevice('Mozilla/5.0 (Linux; Android 14; Pixel 8)'), true);
  assert.equal(isMobileDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5), true);
  assert.equal(isMobileDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'), false);
  assert.equal(isMobileDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'), false);
});

test('extracts only explicitly labeled wine details from English and German label text', () => {
  assert.deepEqual(extractWineSuggestions([
    'Wine: Pinot Noir Reserve',
    'Producer: Sonnenhof Estate',
    'Vintage: 2019',
    '13,5 % vol.',
    'Type: Red wine',
    'Region: Rheingau',
    'Country: Germany',
  ].join('\n')), {
    name: 'Pinot Noir Reserve',
    producer: 'Sonnenhof Estate',
    vintage: '2019',
    alcohol: '13.5',
    type: 'red',
    region: 'Rheingau',
    country: 'Germany',
  });

  assert.deepEqual(extractWineSuggestions([
    'Wein: Riesling Kabinett',
    'Weingut: Beispielhof',
    'Jahrgang: 2020',
    '12,5 % vol.',
    'Weinart: Weißwein',
    'Anbaugebiet: Mosel',
    'Land: Deutschland',
  ].join('\n')), {
    name: 'Riesling Kabinett',
    producer: 'Beispielhof',
    vintage: '2020',
    alcohol: '12.5',
    type: 'white',
    region: 'Mosel',
    country: 'Deutschland',
  });
});

test('recognizes the remaining supported wine styles', () => {
  assert.equal(extractWineSuggestions('Type: Rosé').type, 'rose');
  assert.equal(extractWineSuggestions('Type: Sparkling wine').type, 'sparkling');
  assert.equal(extractWineSuggestions('Weinart: Schaumwein').type, 'sparkling');
});

test('leaves uncertain fields blank instead of guessing from unlabeled text', () => {
  assert.deepEqual(extractWineSuggestions('Chateau Example\nGrand Reserve\nBordeaux\nMerlot'), {
    name: '',
    producer: '',
    vintage: '',
    alcohol: '',
    type: '',
    region: '',
    country: '',
  });
});

test('runs OCR through a disposable worker and returns editable suggestions', async () => {
  const file = { name: 'label.jpg', type: 'image/jpeg', size: 1024 };
  let terminated = false;
  const result = await scanWineLabel(file, {
    workerFactory: async () => ({
      recognize: async (image) => {
        assert.equal(image, file);
        return { data: { text: 'Vintage: 2018' } };
      },
      terminate: async () => { terminated = true; },
    }),
  });

  assert.equal(result.text, 'Vintage: 2018');
  assert.equal(result.suggestions.vintage, '2018');
  assert.equal(terminated, true);
});

test('terminates its OCR worker and reports OCR failures', async () => {
  let terminated = false;
  await assert.rejects(
    scanWineLabel({ name: 'label.jpg', type: 'image/jpeg', size: 1024 }, {
      workerFactory: async () => ({
        recognize: async () => { throw new Error('OCR failed'); },
        terminate: async () => { terminated = true; },
      }),
    }),
    /OCR failed/,
  );
  assert.equal(terminated, true);
});

test('rejects unsupported scan files before starting OCR', async () => {
  let workerStarted = false;
  await assert.rejects(
    scanWineLabel({ name: 'label.pdf', type: 'application/pdf', size: 1024 }, {
      workerFactory: async () => {
        workerStarted = true;
        return {};
      },
    }),
    /JPG, PNG, or WebP/i,
  );
  assert.equal(workerStarted, false);
});
