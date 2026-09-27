import { validateImageFile } from './wineImage.js';

const EMPTY_SUGGESTIONS = {
  name: '',
  producer: '',
  vintage: '',
  alcohol: '',
  type: '',
  region: '',
  country: '',
};

const LABELS = {
  name: /^(?:wine(?:\s+name)?|wein(?:name)?|name)\s*[:：-]\s*(.+)$/i,
  producer: /^(?:producer|winery|estate|weingut|domaine|produzent)\s*[:：-]\s*(.+)$/i,
  vintage: /^(?:vintage|jahrgang|mill[eé]sime)\s*[:：-]\s*(\d{4})$/i,
  type: /^(?:type|wine\s+type|weinart)\s*[:：-]\s*(.+)$/i,
  region: /^(?:region|appellation|anbaugebiet|gebiet)\s*[:：-]\s*(.+)$/i,
  country: /^(?:country|land)\s*[:：-]\s*(.+)$/i,
};

const TYPES = [
  { type: 'red', pattern: /^(?:red(?:\s+wine)?|rotwein)$/i },
  { type: 'white', pattern: /^(?:white(?:\s+wine)?|wei(?:ss|ß)wein)$/i },
  { type: 'rose', pattern: /^(?:ros[eé](?:\s+wine)?|ros[eé])$/i },
  { type: 'sparkling', pattern: /^(?:sparkling(?:\s+wine)?|sekt|schaumwein)$/i },
];

function getWineType(value) {
  return TYPES.find(({ pattern }) => pattern.test(value))?.type || '';
}

export function isMobileDevice(userAgent = '', maxTouchPoints = 0) {
  return /android|iphone|ipad|ipod/i.test(userAgent)
    || (/macintosh/i.test(userAgent) && maxTouchPoints > 1);
}

export function extractWineSuggestions(text) {
  const suggestions = { ...EMPTY_SUGGESTIONS };
  const lines = String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  for (const line of lines) {
    for (const [field, pattern] of Object.entries(LABELS)) {
      const match = line.match(pattern);
      if (match) {
        const value = match[1].trim().replace(/[;,]+$/, '').trim();
        suggestions[field] = field === 'type' ? getWineType(value) : value;
        break;
      }
    }

    const alcohol = line.match(/\b(\d{1,2}(?:[.,]\d{1,2})?)\s*%\s*(?:(?:vol(?:ume)?\.?|alc(?:ohol)?|abv)\b)?/i);
    if (alcohol) {
      suggestions.alcohol = alcohol[1].replace(',', '.');
    }

    const wineType = getWineType(line);
    if (wineType) {
      suggestions.type = wineType;
    }
  }

  return suggestions;
}

async function createOcrWorker() {
  const { createWorker } = await import('tesseract.js');
  return createWorker('eng+deu');
}

export async function scanWineLabel(file, { workerFactory = createOcrWorker } = {}) {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const worker = await workerFactory();
  try {
    const { data } = await worker.recognize(file);
    const text = data.text || '';
    return { text, suggestions: extractWineSuggestions(text) };
  } finally {
    await worker.terminate();
  }
}
