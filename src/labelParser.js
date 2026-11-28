// Turns OCR lines read from a wine label into suggested form values.
// Input: [{ text, height }] in reading order (height = text size in px, optional).
// Output: only the fields that were recognised, e.g. { vintage: 2019, region: 'Nahe' }.

import { GRAPES } from './grapeVarieties.js';
import { normalize } from './normalizeText.js';

const COUNTRIES = [
  ['Deutschland', ['deutschland', 'germany', 'allemagne', 'germania']],
  ['Frankreich', ['france', 'frankreich', 'francia']],
  ['Italien', ['italia', 'italy', 'italien', 'italie']],
  ['Spanien', ['espana', 'spain', 'spanien', 'espagne']],
  ['Österreich', ['osterreich', 'austria', 'autriche']],
  ['Portugal', ['portugal']],
  ['Schweiz', ['schweiz', 'suisse', 'switzerland', 'svizzera']],
  ['USA', ['usa', 'united states', 'california']],
  ['Australien', ['australia', 'australien']],
  ['Neuseeland', ['new zealand', 'neuseeland']],
  ['Südafrika', ['south africa', 'sudafrika']],
  ['Argentinien', ['argentina', 'argentinien']],
  ['Chile', ['chile']],
];

// [label text, country]
const REGIONS = [
  ['Mosel', 'Deutschland'], ['Rheingau', 'Deutschland'], ['Rheinhessen', 'Deutschland'], ['Pfalz', 'Deutschland'],
  ['Nahe', 'Deutschland'], ['Baden', 'Deutschland'], ['Württemberg', 'Deutschland'], ['Franken', 'Deutschland'],
  ['Ahr', 'Deutschland'], ['Mittelrhein', 'Deutschland'], ['Saale-Unstrut', 'Deutschland'], ['Sachsen', 'Deutschland'],
  ['Hessische Bergstraße', 'Deutschland'],
  ['Bordeaux', 'Frankreich'], ['Margaux', 'Frankreich'], ['Pauillac', 'Frankreich'], ['Saint-Julien', 'Frankreich'],
  ['Saint-Estèphe', 'Frankreich'], ['Saint-Émilion', 'Frankreich'], ['Pomerol', 'Frankreich'], ['Pessac-Léognan', 'Frankreich'],
  ['Sauternes', 'Frankreich'], ['Médoc', 'Frankreich'], ['Haut-Médoc', 'Frankreich'], ['Graves', 'Frankreich'],
  ['Bourgogne', 'Frankreich'], ['Burgundy', 'Frankreich'], ['Chablis', 'Frankreich'], ['Beaune', 'Frankreich'],
  ['Meursault', 'Frankreich'], ['Pommard', 'Frankreich'], ['Gevrey-Chambertin', 'Frankreich'], ['Nuits-Saint-Georges', 'Frankreich'],
  ['Puligny-Montrachet', 'Frankreich'], ['Chassagne-Montrachet', 'Frankreich'], ['Beaujolais', 'Frankreich'],
  ['Champagne', 'Frankreich'], ['Alsace', 'Frankreich'], ['Elsass', 'Frankreich'], ['Loire', 'Frankreich'],
  ['Sancerre', 'Frankreich'], ['Vouvray', 'Frankreich'], ['Côtes du Rhône', 'Frankreich'], ['Rhône', 'Frankreich'],
  ['Châteauneuf-du-Pape', 'Frankreich'], ['Hermitage', 'Frankreich'], ['Côte-Rôtie', 'Frankreich'], ['Provence', 'Frankreich'],
  ['Languedoc', 'Frankreich'], ['Roussillon', 'Frankreich'],
  ['Toscana', 'Italien'], ['Tuscany', 'Italien'], ['Chianti Classico', 'Italien'], ['Chianti', 'Italien'],
  ['Brunello di Montalcino', 'Italien'], ['Montalcino', 'Italien'], ['Bolgheri', 'Italien'], ['Montepulciano', 'Italien'],
  ['Piemonte', 'Italien'], ['Barolo', 'Italien'], ['Barbaresco', 'Italien'], ['Langhe', 'Italien'],
  ['Veneto', 'Italien'], ['Valpolicella', 'Italien'], ['Amarone', 'Italien'], ['Soave', 'Italien'],
  ['Alto Adige', 'Italien'], ['Südtirol', 'Italien'], ['Trentino', 'Italien'], ['Friuli', 'Italien'],
  ['Sicilia', 'Italien'], ['Puglia', 'Italien'], ['Abruzzo', 'Italien'], ['Franciacorta', 'Italien'],
  ['Rioja', 'Spanien'], ['Ribera del Duero', 'Spanien'], ['Priorat', 'Spanien'], ['Rías Baixas', 'Spanien'],
  ['Rueda', 'Spanien'], ['Toro', 'Spanien'], ['Jerez', 'Spanien'], ['Penedès', 'Spanien'],
  ['Wachau', 'Österreich'], ['Kamptal', 'Österreich'], ['Kremstal', 'Österreich'], ['Burgenland', 'Österreich'],
  ['Steiermark', 'Österreich'], ['Weinviertel', 'Österreich'],
  ['Douro', 'Portugal'], ['Alentejo', 'Portugal'], ['Dão', 'Portugal'], ['Vinho Verde', 'Portugal'],
  ['Napa Valley', 'USA'], ['Sonoma', 'USA'], ['Willamette Valley', 'USA'],
  ['Barossa Valley', 'Australien'], ['Barossa', 'Australien'], ['McLaren Vale', 'Australien'], ['Margaret River', 'Australien'],
  ['Marlborough', 'Neuseeland'], ['Central Otago', 'Neuseeland'],
  ['Stellenbosch', 'Südafrika'], ['Mendoza', 'Argentinien'], ['Maipo', 'Chile'], ['Colchagua', 'Chile'],
];

const TYPE_WORDS = [
  ['sparkling', /\b(?:champagne|cremant|sekt|cava|prosecco|spumante|franciacorta|schaumwein|mousseux|brut|blanc de blancs|blanc de noirs)\b/],
  ['rose', /\b(?:rose|rosato|rosado|weissherbst|rosewein)\b/],
  ['red', /\b(?:rotwein|red wine|rouge|rosso|tinto)\b/],
  ['white', /\b(?:weisswein|white wine|vin blanc|bianco|blanco)\b/],
];

const PRODUCER_PREFIX = /^(?:weingut|weinhaus|winzerhof|schloss|domaine|chateau|maison|bodegas?|tenuta|cantina|cantine|azienda agricola|fattoria|marchesi|castello|quinta|vignobles?|famille|estate|herdade)\b/;
const PRODUCER_SUFFIX = /\b(?:winery|wines|estate|vineyards|weingut)$/;
const BOTTLER = /(?:erzeugerabfullung|gutsabfullung|abgefullt (?:von|durch)|elabore par|mis en bouteille par|imbottigliato da|embotellado por|produced and bottled by|produced by|bottled by|vinified by)\s*:?\s*(.+)$/;
const BOILERPLATE = /\b(?:grand vin|appellation|controlee|protegee|mis en bouteille|product of|produce of|produit de|enthalt sulfite|contains sulfites|qualitatswein|pradikatswein|indicazione|denominazione|docg?|igt|aoc|aop|dop|trocken|halbtrocken|feinherb|lieblich|brut|ml|cl|vol|premier cru|grand cru|cru classe|grosses gewachs|erste lage|seit|since|depuis|gegrundet|founded|reserve|riserva)\b/;

const wordRegex = (phrase) => new RegExp(`(?:^|[^\\p{L}])${normalize(phrase).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|[^\\p{L}])`, 'u');

function findAlcohol(lines) {
  for (const line of lines) {
    const match = line.norm.match(/(\d{1,2}(?:[.,]\d{1,2})?)\s*%/);
    if (!match) continue;
    const value = Number(match[1].replace(',', '.'));
    if (value >= 5 && value <= 22) {
      line.used = true;
      return String(value);
    }
  }
  return undefined;
}

function findVintage(lines, currentYear) {
  let fallback;
  for (const line of lines) {
    if (/\b(?:seit|since|depuis|dal|desde|gegrundet|founded|est)\b/.test(line.norm)) continue;
    for (const match of line.norm.matchAll(/\b(19[5-9]\d|20\d\d)\b/g)) {
      const year = Number(match[1]);
      if (year > currentYear) continue;
      if (line.norm === match[1]) {
        line.used = true;
        return year;
      }
      fallback ??= year;
    }
  }
  return fallback;
}

function findGrapes(text) {
  const found = [];
  for (const [name, , aliases = []] of GRAPES) {
    if ([name, ...aliases].some((alias) => wordRegex(alias).test(text))) found.push(name);
  }
  // "Pinot Noir" also contains "Pinot", "Cabernet Sauvignon" must not imply "Sauvignon Blanc", etc. — names are distinct enough.
  return found;
}

function findType(text, grapes) {
  for (const [type, pattern] of TYPE_WORDS) {
    if (pattern.test(text)) return type;
  }
  const colours = new Set(grapes.map((grape) => GRAPES.find(([name]) => name === grape)[1]));
  return colours.size === 1 ? [...colours][0] : undefined;
}

function findRegion(text) {
  let best;
  for (const [name, country] of REGIONS) {
    if (wordRegex(name).test(text) && (!best || name.length > best.name.length)) best = { name, country };
  }
  return best;
}

function findCountry(text) {
  for (const [name, aliases] of COUNTRIES) {
    if (aliases.some((alias) => wordRegex(alias).test(text))) return name;
  }
  return undefined;
}

function findProducer(lines) {
  for (const [index, line] of lines.entries()) {
    if (!PRODUCER_PREFIX.test(line.norm) && !PRODUCER_SUFFIX.test(line.norm)) continue;
    // "Marchesi" / "Weingut" alone on a line: the name follows on the next line.
    if (!line.norm.includes(' ') && lines[index + 1]) {
      line.used = true;
      lines[index + 1].used = true;
      return `${line.text} ${lines[index + 1].text}`;
    }
    line.used = true;
    return line.text;
  }
  for (const line of lines) {
    const match = line.norm.match(BOTTLER);
    if (!match) continue;
    // Recover the original spelling: the shortest raw-text tail whose normalised form is the match.
    const words = line.text.split(/\s+/);
    const start = words.findIndex((_, index) => normalize(words.slice(index).join(' ')) === match[1]);
    const value = start >= 0 ? words.slice(start).join(' ').split(',')[0].trim() : '';
    if (value.length >= 3) {
      line.used = true;
      return value;
    }
  }
  return undefined;
}

function stripKnownWords(norm) {
  let rest = ` ${norm} `;
  for (const [name, , aliases = []] of GRAPES) {
    for (const alias of [name, ...aliases]) rest = rest.replace(wordRegex(alias), ' ');
  }
  for (const [, pattern] of TYPE_WORDS) rest = rest.replace(pattern, ' ');
  return rest.replace(/[^\p{L}]+/gu, '');
}

function findName(lines, region, country) {
  const regionNorm = region ? normalize(region) : '';
  const candidates = lines.filter((line) => {
    if (line.used || BOILERPLATE.test(line.norm)) return false;
    if (regionNorm && line.norm === regionNorm) return false;
    if (country && findCountry(line.norm) && line.norm.split(' ').length <= 3) return false;
    return stripKnownWords(line.norm).length >= 3;
  });
  if (!candidates.length) return undefined;
  return candidates.reduce((best, line) => ((line.height || 0) > (best.height || 0) ? line : best)).text;
}

export function parseLabelLines(rawLines, { currentYear = new Date().getFullYear() } = {}) {
  const lines = (rawLines || [])
    .map(({ text, height }) => ({ text: String(text ?? '').replace(/\s+/g, ' ').trim(), height: Number(height) || 0 }))
    .map((line) => ({ ...line, norm: normalize(line.text), used: false }))
    .filter((line) => (line.norm.match(/[\p{L}\p{N}]/gu) || []).length >= 2);
  if (!lines.length) return {};

  const allText = lines.map((line) => line.norm).join(' \n ');
  const result = {};

  const producer = findProducer(lines);
  const vintage = findVintage(lines, currentYear);
  const alcohol = findAlcohol(lines);
  const grapes = findGrapes(allText);
  const type = findType(allText, grapes);
  const region = findRegion(allText);
  const country = findCountry(allText) || region?.country;
  let name = findName(lines, region?.name, country);
  if (!name && producer && /^(?:chateau|domaine|tenuta|castello|quinta)\b/.test(normalize(producer))) name = producer;

  if (name) result.name = name;
  if (producer) result.producer = producer;
  if (vintage) result.vintage = vintage;
  if (alcohol) result.alcohol = alcohol;
  if (type) result.type = type;
  if (region) result.region = region.name;
  if (country) result.country = country;
  if (grapes.length) result.grapes = grapes;
  return result;
}
