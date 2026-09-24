const REQUIRED_FIELDS = ['name', 'producer', 'region', 'country', 'style', 'qty', 'price', 'vintage', 'rating', 'grapes'];
const WINE_STYLES = new Set(['red', 'white', 'sparkling', 'rose']);
const isNumber = (value) => typeof value === 'number' && Number.isFinite(value);

const duplicateKey = (wine) => [
  wine.name,
  wine.producer,
  wine.vintage,
].map((value) => String(value).trim().toLowerCase()).join('|');

const validateWine = (wine, index) => {
  if (!wine || typeof wine !== 'object' || Array.isArray(wine)) {
    return `Wine ${index + 1} must be an object.`;
  }

  const missing = REQUIRED_FIELDS.filter((field) => wine[field] === undefined || wine[field] === null || wine[field] === '');
  if (missing.length) {
    return `Wine ${index + 1} is missing required field(s): ${missing.join(', ')}.`;
  }

  if (['name', 'producer', 'region', 'country'].some((field) => typeof wine[field] !== 'string' || !wine[field].trim())) {
    return `Wine ${index + 1} must have text values for name, producer, region, and country.`;
  }

  if (!WINE_STYLES.has(wine.style)) {
    return `Wine ${index + 1} has an invalid style. Use red, white, sparkling, or rose.`;
  }

  if (!isNumber(wine.qty) || !Number.isInteger(wine.qty) || wine.qty < 0
    || !isNumber(wine.price) || wine.price < 0
    || !Number.isInteger(wine.vintage)
    || !isNumber(wine.rating) || wine.rating < 0 || wine.rating > 5) {
    return `Wine ${index + 1} has invalid numeric values for qty, price, vintage, or rating.`;
  }

  if (!Array.isArray(wine.grapes) || wine.grapes.length === 0
    || wine.grapes.some((grape) => !grape || typeof grape.name !== 'string' || !grape.name.trim()
      || !isNumber(grape.pct) || grape.pct < 0 || grape.pct > 100)) {
    return `Wine ${index + 1} must contain grapes with a name and pct between 0 and 100.`;
  }

  return null;
};

export function importWinesFromJson(json, existingWines = [], createId = () => crypto.randomUUID()) {
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { wines: [], errors: ['The file does not contain valid JSON.'], messages: [], skipped: 0 };
  }

  if (!Array.isArray(parsed)) {
    return { wines: [], errors: ['The JSON root must be an array of wines.'], messages: [], skipped: 0 };
  }

  const knownKeys = new Set(existingWines.map(duplicateKey));
  const wines = [];
  const errors = [];
  const messages = [];

  parsed.forEach((wine, index) => {
    const validationError = validateWine(wine, index);
    if (validationError) {
      errors.push(validationError);
      return;
    }

    const key = duplicateKey(wine);
    if (knownKeys.has(key)) {
      messages.push(`Skipped duplicate wine: ${wine.name}.`);
      return;
    }

    knownKeys.add(key);
    wines.push({
      id: createId(),
      name: wine.name.trim(),
      producer: wine.producer.trim(),
      region: wine.region.trim(),
      country: wine.country.trim(),
      type: wine.style,
      qty: wine.qty,
      price: wine.price,
      vintage: wine.vintage,
      rating: wine.rating,
      grapes: wine.grapes.map((grape) => ({ name: grape.name.trim(), pct: grape.pct })),
      alcohol: '',
      cellar: 'Keller 1',
      drinkFrom: '',
      drinkUntil: '',
      notes: '',
      image: '',
    });
  });

  return { wines, errors, messages, skipped: messages.length };
}
