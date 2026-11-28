// Folds text for matching: no accents/umlauts, lower case, ß → ss, punctuation collapsed to single spaces.
export function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/[^\p{L}\p{N}%.,]+/gu, ' ')
    .trim();
}
