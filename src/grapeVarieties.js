import { normalize } from './normalizeText.js';

// [name, colour, aliases] — shared by the label scanner and the grape autocomplete.
export const GRAPES = [
  ['Riesling', 'white'], ['Chardonnay', 'white'], ['Sauvignon Blanc', 'white'], ['Grüner Veltliner', 'white'],
  ['Silvaner', 'white', ['sylvaner']], ['Müller-Thurgau', 'white', ['muller thurgau']], ['Grauburgunder', 'white'],
  ['Weißburgunder', 'white', ['weissburgunder']], ['Pinot Grigio', 'white'], ['Pinot Gris', 'white'], ['Pinot Blanc', 'white'],
  ['Gewürztraminer', 'white', ['gewurztraminer']], ['Chenin Blanc', 'white'], ['Viognier', 'white'], ['Albariño', 'white'],
  ['Scheurebe', 'white'], ['Kerner', 'white'], ['Gutedel', 'white'], ['Sémillon', 'white'], ['Vermentino', 'white'],
  ['Spätburgunder', 'red', ['spatburgunder']], ['Pinot Noir', 'red'], ['Cabernet Sauvignon', 'red'], ['Cabernet Franc', 'red'],
  ['Merlot', 'red'], ['Syrah', 'red'], ['Shiraz', 'red'], ['Grenache', 'red'], ['Garnacha', 'red'], ['Tempranillo', 'red'],
  ['Sangiovese', 'red'], ['Nebbiolo', 'red'], ['Barbera', 'red'], ['Primitivo', 'red'], ['Zinfandel', 'red'],
  ['Malbec', 'red'], ['Gamay', 'red'], ['Lemberger', 'red'], ['Blaufränkisch', 'red'], ['Zweigelt', 'red'],
  ['Dornfelder', 'red'], ['Trollinger', 'red'], ['Montepulciano', 'red'], ['Touriga Nacional', 'red'], ['Carménère', 'red'],
  ['Pinotage', 'red'], ['Mourvèdre', 'red'], ['Corvina', 'red'], ['Nero d’Avola', 'red', ['nero d avola']],
];

// Different names for the same grape. Kept apart from GRAPES' aliases on purpose: the label scanner
// should report the name printed on the label, while the autocomplete may offer every synonym.
export const GRAPE_SYNONYMS = [
  ['Spätburgunder', 'Pinot Noir'],
  ['Grauburgunder', 'Pinot Gris', 'Pinot Grigio'],
  ['Weißburgunder', 'Pinot Blanc'],
  ['Syrah', 'Shiraz'],
  ['Grenache', 'Garnacha'],
  ['Primitivo', 'Zinfandel'],
  ['Lemberger', 'Blaufränkisch'],
];

const ALIASES = new Map(GRAPES.map(([name, , aliases = []]) => [name, aliases]));

// Everything a grape can be found by, besides its own name: its aliases and its synonyms (with their aliases).
function otherTerms(name) {
  const synonyms = GRAPE_SYNONYMS.find((group) => group.includes(name)) || [];
  return [
    ...(ALIASES.get(name) || []),
    ...synonyms.filter((other) => other !== name).flatMap((other) => [other, ...(ALIASES.get(other) || [])]),
  ].map(normalize);
}

const startsAWord = (term, query) => term.startsWith(query) || term.includes(` ${query}`);

// 0: name starts with the query, 1: a later word of the name does, 2: name contains it,
// 3: an alias/synonym starts with it (or a word of it), 4: an alias/synonym contains it.
function rank(name, query) {
  const term = normalize(name);
  if (term.startsWith(query)) return 0;
  if (term.includes(` ${query}`)) return 1;
  if (term.includes(query)) return 2;
  const others = otherTerms(name);
  if (others.some((other) => startsAWord(other, query))) return 3;
  if (others.some((other) => other.includes(query))) return 4;
  return -1;
}

// Grape names to offer while typing `query`, best match first. `knownGrapes` are names already used in
// the cellar; spellings that only differ in case/accents/spacing from a listed grape are merged into it.
export function suggestGrapes(query, knownGrapes = [], { limit = 8 } = {}) {
  const needle = normalize(query);
  if (!needle) return [];

  const candidates = new Map();
  for (const name of [...GRAPES.map(([grape]) => grape), ...knownGrapes]) {
    const clean = String(name ?? '').replace(/\s+/g, ' ').trim();
    const key = normalize(clean);
    if (key && !candidates.has(key)) candidates.set(key, clean);
  }

  const typed = String(query).trim();
  return [...candidates.values()]
    .filter((name) => name !== typed)
    .map((name) => ({ name, score: rank(name, needle) }))
    .filter(({ score }) => score >= 0)
    .sort((left, right) => left.score - right.score || left.name.localeCompare(right.name, 'de'))
    .slice(0, limit)
    .map(({ name }) => name);
}
