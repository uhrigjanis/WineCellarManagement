import { normalize } from './normalizeText.js';
import { cleanName, rankSuggestions, uniqueBy } from './suggest.js';

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
  ];
}

// Grape names to offer while typing `query`, best match first. `knownGrapes` are names already used in
// the cellar; spellings that only differ in case/accents/spacing from a listed grape are merged into it.
export function suggestGrapes(query, knownGrapes = [], options) {
  const names = uniqueBy([...GRAPES.map(([grape]) => grape), ...knownGrapes].map(cleanName), normalize);
  return rankSuggestions(query, names.map((name) => ({ name, aliases: otherTerms(name) })), options);
}
