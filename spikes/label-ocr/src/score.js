// Scores how well an engine's output text covers the expected label values.
// Matching is accent-, case- and punctuation-insensitive and tolerates small
// OCR errors (edit distance ≤ 20 % of the expected value's length).

export const FIELDS = ['name', 'producer', 'vintage', 'region'];

export function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function levenshtein(a, b) {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

// Best edit distance of `needle` against any equally long word window in `haystack`.
function bestWindowDistance(needle, haystack) {
  const words = haystack.split(' ').filter(Boolean);
  const size = needle.split(' ').length;
  let best = Infinity;
  for (let n = Math.max(1, size - 1); n <= size + 1; n += 1) {
    for (let i = 0; i + n <= words.length; i += 1) {
      best = Math.min(best, levenshtein(needle, words.slice(i, i + n).join(' ')));
      if (best === 0) return 0;
    }
  }
  return best;
}

export function matchField(expected, text) {
  const needle = normalize(expected);
  if (!needle) return null;
  const haystack = normalize(text);
  if (haystack.includes(needle)) return true;
  if (/^\d+$/.test(needle)) return false; // vintages must match exactly
  return bestWindowDistance(needle, haystack) <= Math.floor(needle.length * 0.2);
}

export function scoreResult(expected, text) {
  const fields = {};
  let hits = 0;
  let total = 0;
  for (const field of FIELDS) {
    const hit = matchField(expected?.[field], text);
    fields[field] = hit;
    if (hit !== null) {
      total += 1;
      if (hit) hits += 1;
    }
  }
  return { fields, hits, total };
}
