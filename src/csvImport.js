const HEADER_ALIASES = {
  producer: ['winery', 'producer', 'maker', 'winemaker', 'producername'],
  name: ['winename', 'name', 'wine'],
  vintage: ['vintage', 'year', 'harvestyear'],
  region: ['region', 'area', 'appellation', 'winegrowingregion'],
  country: ['country', 'nation'],
  type: ['winetype', 'type', 'style', 'category', 'kind'],
  qty: ['usercellarcount', 'cellarcount', 'quantity', 'qty', 'bottles', 'count'],
  price: ['price', 'cost', 'purchaseprice'],
  rating: ['rating', 'score'],
  alcohol: ['alcohol', 'alcoholpercent', 'abv'],
  notes: ['notes', 'note', 'comment', 'comments'],
  grapes: ['grapes', 'grape', 'varieties', 'variety'],
  drinkFrom: ['drinkfrom'],
  drinkUntil: ['drinkuntil'],
};

const MAPPING_FIELDS = Object.keys(HEADER_ALIASES);
const normalizeHeader = (header) => header.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]/g, '');

export function detectCsvDelimiter(text) {
  const firstLine = String(text).split(/\r\n|\n|\r/, 1)[0] || '';
  const candidates = [',', ';', '\t', '|'];
  return candidates.map((delimiter) => ({
    delimiter,
    count: firstLine.split(delimiter).length - 1,
  })).sort((left, right) => right.count - left.count)[0].delimiter;
}

export function parseCsv(text, delimiter = ',') {
  if (typeof delimiter !== 'string' || delimiter.length !== 1 || delimiter === '"' || /[\r\n]/.test(delimiter)) {
    return { headers: [], rows: [], errors: ['Choose a single valid CSV delimiter.'] };
  }

  const source = String(text ?? '').replace(/^\uFEFF/, '');
  const records = [];
  const errors = [];
  let record = [];
  let field = '';
  let inQuotes = false;
  let afterQuote = false;
  let rowHasContent = false;

  const finishField = () => {
    record.push(field.trim());
    field = '';
    afterQuote = false;
  };
  const finishRecord = () => {
    finishField();
    if (rowHasContent || record.some((value) => value)) records.push(record);
    record = [];
    rowHasContent = false;
  };

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (inQuotes) {
      if (char === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
        afterQuote = true;
      } else {
        field += char;
      }
      continue;
    }

    if (char === delimiter) {
      finishField();
      rowHasContent = true;
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[index + 1] === '\n') index += 1;
      finishRecord();
    } else if (char === '"' && !field && !afterQuote) {
      inQuotes = true;
      rowHasContent = true;
    } else if (afterQuote && (char === ' ' || char === '\t')) {
      continue;
    } else {
      if (char === '"') errors.push(`Unexpected quote in CSV row ${records.length + 1}.`);
      if (afterQuote) {
        errors.push(`Unexpected character after a closing quote in CSV row ${records.length + 1}.`);
        afterQuote = false;
      }
      field += char;
      if (char.trim()) rowHasContent = true;
    }
  }

  if (inQuotes) errors.push('The CSV contains an unclosed quoted field.');
  if (field || record.length || rowHasContent || afterQuote) finishRecord();

  if (!records.length) {
    return { headers: [], rows: [], errors: [...errors, 'The CSV file is empty.'] };
  }

  const headers = records.shift().map((header) => header.replace(/^\uFEFF/, '').trim());
  if (!headers.length || headers.every((header) => !header)) {
    errors.push('The CSV must include a header row.');
  }

  const normalizedHeaders = headers.map(normalizeHeader);
  const duplicateHeaders = headers.filter((header, index) => (
    normalizedHeaders.indexOf(normalizeHeader(header)) !== index
  ));
  if (duplicateHeaders.length) {
    errors.push(`The CSV contains duplicate column header(s): ${[...new Set(duplicateHeaders)].join(', ')}.`);
  }

  const rows = records.map((values, index) => {
    if (values.length !== headers.length) {
      errors.push(`CSV row ${index + 2} has ${values.length} columns; expected ${headers.length}.`);
    }
    return values;
  });

  return { headers, rows, errors };
}

export function decodeCsvFile(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

export function suggestCsvMapping(headers) {
  return Object.fromEntries(MAPPING_FIELDS.map((field) => [
    field,
    headers.find((header) => HEADER_ALIASES[field].includes(normalizeHeader(header))) || '',
  ]));
}

const resolveMapping = (headers, mapping = {}) => {
  const suggested = suggestCsvMapping(headers);
  return Object.fromEntries(MAPPING_FIELDS.map((field) => {
    const selected = Object.hasOwn(mapping, field) ? mapping[field] : suggested[field];
    return [field, selected ? headers.indexOf(selected) : -1];
  }));
};

const parseNumeric = (value) => {
  const normalized = String(value).trim().replace(/\s/g, '').replace(/[€$£%]/g, '');
  if (!normalized) return null;
  const decimalNormalized = normalized.includes(',') && !normalized.includes('.')
    ? normalized.replace(',', '.')
    : normalized.replace(/,/g, '');
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(decimalNormalized)) return Number.NaN;
  return Number(decimalNormalized);
};

const mapWineType = (value) => {
  const normalized = normalizeHeader(value);
  if (['red', 'redwine', 'rot', 'rotwein'].includes(normalized)) return 'red';
  if (['white', 'whitewine', 'weiss', 'weisswein'].includes(normalized)) return 'white';
  if (['sparkling', 'sparklingwine', 'bubbles', 'schaumwein', 'sekt'].includes(normalized)) return 'sparkling';
  if (['rose', 'rosewine', 'roswein'].includes(normalized)) return 'rose';
  return null;
};

const duplicateKey = (wine) => [wine.name, wine.producer, wine.vintage]
  .map((value) => String(value).trim().toLowerCase()).join('|');

export function importWinesFromCsv(text, existingWines = [], createId = () => crypto.randomUUID(), options = {}) {
  const delimiter = options.delimiter || detectCsvDelimiter(text);
  const parsed = parseCsv(text, delimiter);
  if (parsed.errors.length) {
    return { headers: parsed.headers, rows: [], wines: [], errors: parsed.errors, messages: [], skipped: 0 };
  }

  const columns = resolveMapping(parsed.headers, options.mapping);
  if (!parsed.rows.length) {
    return {
      headers: parsed.headers,
      rows: [],
      wines: [],
      errors: ['The CSV contains a header but no wine rows.'],
      messages: [],
      skipped: 0,
    };
  }
  const required = ['producer', 'name', 'region', 'country', 'type', 'qty'];
  const missingHeaders = required.filter((field) => columns[field] < 0);
  if (missingHeaders.length) {
    const labels = { producer: 'Winery/producer', name: 'wine name', region: 'region', country: 'country', type: 'wine type', qty: 'cellar count' };
    return {
      headers: parsed.headers,
      rows: [],
      wines: [],
      errors: [`Could not find CSV column(s) for: ${missingHeaders.map((field) => labels[field]).join(', ')}.`],
      messages: [],
      skipped: 0,
    };
  }

  const knownKeys = new Set(existingWines.map(duplicateKey));
  const previewRows = [];
  const wines = [];
  const errors = [];
  const messages = [];

  parsed.rows.forEach((row, rowIndex) => {
    const lineNumber = rowIndex + 2;
    const correction = options.corrections?.[lineNumber] || {};
    const value = (field) => (Object.hasOwn(correction, field)
      ? String(correction[field] ?? '').trim()
      : (columns[field] < 0 ? '' : (row[columns[field]] ?? '').trim()));
    const previewRow = {
      lineNumber,
      values: Object.fromEntries(MAPPING_FIELDS.map((field) => [field, value(field)])),
      error: '',
      duplicate: false,
    };
    previewRows.push(previewRow);
    const addRowError = (message) => {
      errors.push(message);
      previewRow.error = message;
    };
    const requiredValues = ['producer', 'name', 'region', 'country', 'type'];
    const missingValues = requiredValues.filter((field) => !value(field));
    if (missingValues.length) {
      addRowError(`CSV row ${lineNumber} is missing required value(s): ${missingValues.join(', ')}.`);
      return;
    }

    const type = mapWineType(value('type'));
    if (!type) {
      addRowError(`CSV row ${lineNumber} has an unsupported wine type "${value('type')}".`);
      return;
    }

    const qty = parseNumeric(value('qty'));
    const vintageValue = value('vintage');
    const vintage = vintageValue ? parseNumeric(vintageValue) : 0;
    const priceValue = value('price');
    const price = priceValue ? parseNumeric(priceValue) : 0;
    const ratingValue = value('rating');
    const rating = ratingValue ? parseNumeric(ratingValue) : 0;
    const alcoholValue = value('alcohol').replace(/%$/, '').trim();
    const alcohol = alcoholValue ? parseNumeric(alcoholValue) : null;

    if (!Number.isInteger(qty) || qty < 0) {
      addRowError(`CSV row ${lineNumber} has an invalid cellar count; use a whole number of zero or more.`);
      return;
    }
    if (!Number.isInteger(vintage) || (vintage !== 0 && (vintage < 1000 || vintage > new Date().getFullYear() + 1))) {
      addRowError(`CSV row ${lineNumber} has an invalid vintage; use a year between 1000 and next year, or leave it blank.`);
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      addRowError(`CSV row ${lineNumber} has an invalid price; use a number of zero or more.`);
      return;
    }
    if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
      addRowError(`CSV row ${lineNumber} has an invalid rating; use a number from 0 to 5.`);
      return;
    }
    if (alcohol !== null && (!Number.isFinite(alcohol) || alcohol < 0 || alcohol > 100)) {
      addRowError(`CSV row ${lineNumber} has an invalid alcohol percentage; use a number from 0 to 100.`);
      return;
    }

    const grapes = value('grapes')
      ? value('grapes').split('|').map((name) => name.trim()).filter(Boolean).map((name) => ({ name, pct: 100 }))
      : [];
    const wine = {
      name: value('name'),
      producer: value('producer'),
      vintage,
    };
    const key = duplicateKey(wine);
    if (knownKeys.has(key)) {
      messages.push(`Skipped duplicate wine: ${wine.name}.`);
      previewRow.duplicate = true;
      return;
    }
    knownKeys.add(key);
    wines.push({
      id: createId(),
      name: wine.name,
      producer: wine.producer,
      region: value('region'),
      country: value('country'),
      type,
      qty,
      price,
      vintage,
      rating,
      grapes,
      alcohol: alcohol === null ? '' : String(alcohol),
      cellar: 'Keller 1',
      drinkFrom: value('drinkFrom'),
      drinkUntil: value('drinkUntil'),
      notes: value('notes'),
      image: '',
    });
  });

  return { headers: parsed.headers, rows: previewRows, wines, errors, messages, skipped: messages.length };
}
