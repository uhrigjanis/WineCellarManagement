import { normalize } from './normalizeText.js';

const startsAWord = (term, query) => term.startsWith(query) || term.includes(` ${query}`);

// 0: name starts with the query, 1: a later word of the name does, 2: name contains it,
// 3: an alias starts with it (or a word of it), 4: an alias contains it, -1: no match.
function rank(name, aliases, query) {
  const term = normalize(name);
  if (term.startsWith(query)) return 0;
  if (term.includes(` ${query}`)) return 1;
  if (term.includes(query)) return 2;
  const others = aliases.map(normalize);
  if (others.some((other) => startsAWord(other, query))) return 3;
  if (others.some((other) => other.includes(query))) return 4;
  return -1;
}

// Names from `candidates` ({ name, aliases?, group? }) matching `query`, best first: lower group, then better
// match, then alphabetical. Folds case/accents/umlauts; a name identical to the typed text is left out.
export function rankSuggestions(query, candidates, { limit = 8 } = {}) {
  const needle = normalize(query);
  if (!needle) return [];

  const typed = String(query).trim();
  return candidates
    .filter(({ name }) => name !== typed)
    .map(({ name, aliases = [], group = 0 }) => ({ name, group, score: rank(name, aliases, needle) }))
    .filter(({ score }) => score >= 0)
    .sort((left, right) => left.group - right.group || left.score - right.score || left.name.localeCompare(right.name, 'de'))
    .slice(0, limit)
    .map(({ name }) => name);
}

// Trims/collapses whitespace and drops entries whose `key` was already seen (first one wins).
export function uniqueBy(entries, key) {
  const seen = new Set();
  return entries.filter((entry) => {
    const id = key(entry);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export const cleanName = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
