import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractWineSuggestions,
  isMobileDevice,
  orderQuadrilateral,
  scanWineLabel,
  validateScanImageFile,
} from './wineScan.js';

test('allows scanning on iOS and Android user agents but not desktop', () => {
  assert.equal(isMobileDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'), true);
  assert.equal(isMobileDevice('Mozilla/5.0 (Linux; Android 14; Pixel 8)'), true);
  assert.equal(isMobileDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5), true);
  assert.equal(isMobileDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'), false);
  assert.equal(isMobileDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'), false);
});

test('accepts supported scanner images, including HEIC, and reports invalid files', () => {
  assert.equal(validateScanImageFile({ name: 'label.jpg', type: 'image/jpeg', size: 1024 }).valid, true);
  assert.equal(validateScanImageFile({ name: 'label.HEIC', type: '', size: 1024 }).valid, true);
  assert.match(validateScanImageFile({ name: 'label.pdf', type: 'application/pdf', size: 1024 }).error, /HEIC/i);
  assert.match(validateScanImageFile({ name: 'label.jpg', type: 'image/jpeg', size: 21 * 1024 * 1024 }).error, /20 MB/i);
});

test('orders detected label corners clockwise from the top-left', () => {
  assert.deepEqual(orderQuadrilateral([
    { x: 80, y: 100 },
    { x: 10, y: 10 },
    { x: 100, y: 20 },
    { x: 20, y: 110 },
  ]), [
    { x: 10, y: 10 },
    { x: 100, y: 20 },
    { x: 80, y: 100 },
    { x: 20, y: 110 },
  ]);
  assert.throws(() => orderQuadrilateral([]), /four corner points/i);
});

test('extracts explicitly labeled wine details from English, German, and French OCR', () => {
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

  assert.deepEqual(extractWineSuggestions([
    'Nom: Champagne Cuvée Réserve',
    'Producteur: Maison Exemple',
    'Millésime: 2018',
    'Appellation: Champagne',
    'Type: Brut Nature',
  ].join('\n')), {
    name: 'Champagne Cuvée Réserve',
    producer: 'Maison Exemple',
    vintage: '2018',
    alcohol: '',
    type: 'sparkling',
    region: 'Champagne',
    country: '',
  });
});

test('suggests fields from a conventional Champagne label layout', () => {
  assert.deepEqual(extractWineSuggestions([
    'C CHAMPAGNE',
    'Pur Meunier',
    'Brut Nature 2018',
    'CAILLEZ LEMAIRE',
    'FAMILLE VIGNERONNE A DAMERY',
  ].join('\n')), {
    name: 'Pur Meunier Brut Nature',
    producer: 'CAILLEZ LEMAIRE',
    vintage: '2018',
    alcohol: '',
    type: 'sparkling',
    region: 'Champagne',
    country: '',
  });
});

test('recognizes the producer beside a Champagne family-vigneron line', () => {
  const suggestions = extractWineSuggestions([
    'C CHAMPAGNE',
    'B But Motine COÖ',
    'CAILLEZ LEMAIRE',
    'FAMILLE VIGNERONNE A DAMERY',
  ].join('\n'));
  assert.equal(suggestions.producer, 'CAILLEZ LEMAIRE');
  assert.equal(suggestions.region, 'Champagne');
  assert.equal(suggestions.type, 'sparkling');
});

test('extracts only readable details from OCR text tested on the supplied Champagne label', () => {
  assert.deepEqual(extractWineSuggestions([
    '«',
    'SC CHAMPAGNE',
    'B But Motine COÖ',
    'CAILLEZ LEMAIRE',
    'B FAMILLE VIGNERONNE AD',
  ].join('\n')), {
    name: '',
    producer: 'CAILLEZ LEMAIRE',
    vintage: '',
    alcohol: '',
    type: 'sparkling',
    region: 'Champagne',
    country: '',
  });
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

test('recognizes processed label orientations and returns the strongest OCR result', async () => {
  const image = { name: 'label.jpg', type: 'image/jpeg', size: 1024 };
  const recognizedImages = [];
  let terminated = false;
  const result = await scanWineLabel(image, {
    preprocess: async (file) => {
      assert.equal(file, image);
      return { images: ['enhanced-label', 'rotated-label'], labelDetected: true };
    },
    workerFactory: async () => ({
      recognize: async (processedImage) => {
        recognizedImages.push(processedImage);
        return processedImage === 'enhanced-label'
          ? { data: { text: 'Wine: Test', confidence: 45 } }
          : { data: { text: 'Vintage: 2018', confidence: 90 } };
      },
      setParameters: async () => {},
      terminate: async () => { terminated = true; },
    }),
  });

  assert.deepEqual(recognizedImages, ['enhanced-label', 'rotated-label']);
  assert.equal(result.text, 'Vintage: 2018');
  assert.equal(result.suggestions.vintage, '2018');
  assert.equal(result.labelDetected, true);
  assert.equal(terminated, true);
});

test('terminates its OCR worker and propagates OCR failures', async () => {
  let terminated = false;
  await assert.rejects(
    scanWineLabel({ name: 'label.jpg', type: 'image/jpeg', size: 1024 }, {
      preprocess: async () => ({ images: ['label'], labelDetected: false }),
      workerFactory: async () => ({
        recognize: async () => { throw new Error('OCR failed'); },
        terminate: async () => { terminated = true; },
      }),
    }),
    /OCR failed/,
  );
  assert.equal(terminated, true);
});

test('rejects unsupported scan files before preprocessing', async () => {
  let preprocessed = false;
  await assert.rejects(
    scanWineLabel({ name: 'label.pdf', type: 'application/pdf', size: 1024 }, {
      preprocess: async () => {
        preprocessed = true;
        return { images: [], labelDetected: false };
      },
    }),
    /HEIC/i,
  );
  assert.equal(preprocessed, false);
});
