const FILTER_FIELDS = ['country', 'producer', 'grape', 'region', 'vintage'];

function normalize(value) {
  return String(value ?? '').trim().toLocaleLowerCase();
}

function getGrapeNames(wine) {
  if (!Array.isArray(wine.grapes)) return [];
  return wine.grapes.map((grape) => (
    typeof grape === 'string' ? grape : grape?.name
  )).filter((name) => String(name ?? '').trim());
}

function getFilterValues(wine, field) {
  if (field === 'grape') return getGrapeNames(wine);
  const value = wine[field];
  return value === undefined || value === null || String(value).trim() === '' ? [] : [value];
}

export function getWineFilterOptions(wines) {
  return Object.fromEntries(FILTER_FIELDS.map((field) => [
    field,
    [...new Set(wines.flatMap((wine) => getFilterValues(wine, field).map(String)))]
      .sort((left, right) => left.localeCompare(right, undefined, { numeric: field === 'vintage' })),
  ]));
}

export function filterWines(wines, { search = '', type = 'all', ...filters } = {}) {
  const normalizedSearch = normalize(search);

  return wines.filter((wine) => {
    if (normalizedSearch && !normalize(`${wine.name ?? ''} ${wine.producer ?? ''}`).includes(normalizedSearch)) {
      return false;
    }
    if (type !== 'all' && wine.type !== type) return false;

    return FILTER_FIELDS.every((field) => {
      const selected = normalize(filters[field]);
      return !selected || getFilterValues(wine, field).some((value) => normalize(value) === selected);
    });
  });
}
