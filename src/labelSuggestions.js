// Applies label-scan suggestions to the wine form without overwriting anything the user entered.
// A field is filled only if it is empty or still holds the value a new wine starts with.

const SCALAR_FIELDS = ['name', 'producer', 'vintage', 'alcohol', 'type', 'region', 'country'];

const isBlank = (value) => value === undefined || value === null || String(value).trim() === '';
const sameValue = (a, b) => String(a ?? '').trim() === String(b ?? '').trim();

export function applyLabelSuggestions(form, suggestions, defaults, createGrape) {
  const next = { ...form };
  const filled = [];

  for (const field of SCALAR_FIELDS) {
    const value = suggestions?.[field];
    if (isBlank(value)) continue;
    const current = form[field];
    if (isBlank(current) || sameValue(current, defaults[field])) {
      if (!sameValue(current, value)) {
        next[field] = value;
        filled.push(field);
      }
    }
  }

  const grapes = suggestions?.grapes || [];
  const hasGrapes = (form.grapes || []).some((grape) => !isBlank(grape.name));
  if (grapes.length && !hasGrapes) {
    next.grapes = grapes.map((name) => ({ ...createGrape(), name }));
    filled.push('grapes');
  }

  return { form: next, filled };
}
