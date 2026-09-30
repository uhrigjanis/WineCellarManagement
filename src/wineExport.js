export const WINE_CSV_HEADERS = [
  'Winery',
  'Wine name',
  'Vintage',
  'Region',
  'Country',
  'Wine type',
  'User cellar count',
];

const csvValue = (value) => {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function serializeWinesAsJson(wines) {
  if (!Array.isArray(wines)) throw new TypeError('Wines must be an array.');
  return JSON.stringify(wines, null, 2);
}

export function serializeWinesAsCsv(wines) {
  if (!Array.isArray(wines)) throw new TypeError('Wines must be an array.');
  const rows = wines.map((wine) => [
    wine.producer,
    wine.name,
    wine.vintage,
    wine.region,
    wine.country,
    wine.type,
    wine.qty,
  ].map(csvValue).join(','));
  return [WINE_CSV_HEADERS.join(','), ...rows].join('\r\n');
}

export function selectWinesForExport(wines, scope, visibleIds = [], selectedIds = []) {
  if (!Array.isArray(wines)) throw new TypeError('Wines must be an array.');
  if (scope === 'all') return [...wines];
  const ids = new Set(scope === 'visible' ? visibleIds : scope === 'selected' ? selectedIds : []);
  if (!['visible', 'selected'].includes(scope)) throw new RangeError('Choose all, visible, or selected wines.');
  return wines.filter((wine) => ids.has(wine.id));
}

export function formatWineExportFilename(format, date = new Date()) {
  if (!['json', 'csv'].includes(format)) throw new RangeError('Choose JSON or CSV format.');
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `winecellar-${year}-${month}-${day}.${format}`;
}

export function downloadWineExport(wines, format) {
  const json = format === 'json';
  if (!json && format !== 'csv') throw new RangeError('Choose JSON or CSV format.');
  const content = json ? serializeWinesAsJson(wines) : serializeWinesAsCsv(wines);
  const blob = new Blob([content], {
    type: json ? 'application/json;charset=utf-8' : 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = formatWineExportFilename(format);
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
