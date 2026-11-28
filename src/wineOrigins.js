import { normalize } from './normalizeText.js';
import { cleanName, rankSuggestions, uniqueBy } from './suggest.js';

// [ISO code, German name, English name, other names] — shared by the country flags and the country autocomplete.
export const COUNTRIES = [
  ['AR', 'Argentinien', 'Argentina'], ['AU', 'Australien', 'Australia'],
  ['AT', 'Österreich', 'Austria', ['oesterreich', 'autriche']], ['BE', 'Belgien', 'Belgium'],
  ['BR', 'Brasilien', 'Brazil'], ['BG', 'Bulgarien', 'Bulgaria'], ['CA', 'Kanada', 'Canada'], ['CL', 'Chile', 'Chile'],
  ['CN', 'China', 'China'], ['HR', 'Kroatien', 'Croatia'], ['CY', 'Zypern', 'Cyprus'],
  ['CZ', 'Tschechien', 'Czechia', ['czech republic']], ['DK', 'Dänemark', 'Denmark'],
  ['FR', 'Frankreich', 'France', ['francia']], ['GE', 'Georgien', 'Georgia'],
  ['DE', 'Deutschland', 'Germany', ['allemagne', 'germania']], ['GR', 'Griechenland', 'Greece'],
  ['HU', 'Ungarn', 'Hungary'], ['IN', 'Indien', 'India'], ['IE', 'Irland', 'Ireland'], ['IL', 'Israel', 'Israel'],
  ['IT', 'Italien', 'Italy', ['italia', 'italie']], ['JP', 'Japan', 'Japan'], ['LB', 'Libanon', 'Lebanon'],
  ['LU', 'Luxemburg', 'Luxembourg'], ['MX', 'Mexiko', 'Mexico'], ['MD', 'Moldau', 'Moldova', ['republik moldau', 'moldawien']],
  ['ME', 'Montenegro', 'Montenegro'], ['MA', 'Marokko', 'Morocco', ['maroc']],
  ['NL', 'Niederlande', 'Netherlands', ['holland']], ['NZ', 'Neuseeland', 'New Zealand'],
  ['MK', 'Nordmazedonien', 'North Macedonia'], ['PE', 'Peru', 'Peru'], ['PL', 'Polen', 'Poland'],
  ['PT', 'Portugal', 'Portugal'], ['RO', 'Rumänien', 'Romania'], ['RU', 'Russland', 'Russia'], ['RS', 'Serbien', 'Serbia'],
  ['SK', 'Slowakei', 'Slovakia'], ['SI', 'Slowenien', 'Slovenia'], ['ZA', 'Südafrika', 'South Africa'],
  ['KR', 'Südkorea', 'South Korea'], ['ES', 'Spanien', 'Spain', ['espana', 'espagne']], ['SE', 'Schweden', 'Sweden'],
  ['CH', 'Schweiz', 'Switzerland', ['suisse', 'svizzera']], ['TW', 'Taiwan', 'Taiwan'], ['TH', 'Thailand', 'Thailand'],
  ['TR', 'Türkei', 'Turkey', ['türkiye', 'turkeye']],
  ['GB', 'Vereinigtes Königreich', 'United Kingdom', ['uk', 'great britain', 'großbritannien', 'england']],
  ['US', 'USA', 'USA', ['united states', 'united states of america', 'vereinigte staaten']],
  ['UY', 'Uruguay', 'Uruguay'], ['UA', 'Ukraine', 'Ukraine'],
  ['CI', 'Elfenbeinküste', 'Côte d’Ivoire', ['cote d ivoire', 'ivory coast']], ['VN', 'Vietnam', 'Vietnam'],
];

// [region, country (German name)] — shared by the label scanner and the region autocomplete.
export const REGIONS = [
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

// Lookup key for country names: no accents, case, spaces or punctuation ("New Zealand" = "newzealand").
const countryKey = (value) => String(value ?? '')
  .trim()
  .toLocaleLowerCase()
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '')
  .replace(/[’'`]/g, '')
  .replace(/[^a-z0-9]/g, '');

const CODES = new Map(COUNTRIES.flatMap(([code, de, en, aliases = []]) => (
  [code, de, en, ...aliases].map((name) => [countryKey(name), code])
)));
const BY_CODE = new Map(COUNTRIES.map((entry) => [entry[0], entry]));
const REGION_CODES = new Map(REGIONS.map(([region, country]) => [normalize(region), CODES.get(countryKey(country))]));

// ISO code for a German/English/alternative country name or ISO code; '' when unknown.
export function getCountryCode(country) {
  return CODES.get(countryKey(country)) || '';
}

// Countries are compared by ISO code, unknown ones by their folded name.
const sameCountryKey = (country) => getCountryCode(country) || normalize(country);

// How to write a listed country: the spelling the cellar already uses for it, else its name in the UI language.
function countryName(code, knownCountries, lang) {
  const known = knownCountries.map(cleanName).find((name) => getCountryCode(name) === code);
  const [, de, en] = BY_CODE.get(code);
  return known || (lang === 'en' ? en : de);
}

// Country names to offer while typing `query`; matches German and English names and aliases.
export function suggestCountries(query, knownCountries = [], { lang = 'de', ...options } = {}) {
  const listed = COUNTRIES.map(([code, de, en, aliases = []]) => ({
    name: countryName(code, knownCountries, lang),
    aliases: [de, en, ...aliases],
  }));
  const unlisted = knownCountries.map(cleanName).filter((name) => name && !getCountryCode(name)).map((name) => ({ name }));
  return rankSuggestions(query, uniqueBy([...listed, ...unlisted], ({ name }) => normalize(name)), options);
}

// The country a region belongs to, as a comparison key: the region list first, then wines in the cellar.
function regionCountryKey(region, knownOrigins) {
  const key = normalize(region);
  if (!key) return '';
  if (REGION_CODES.has(key)) return REGION_CODES.get(key);
  const known = knownOrigins.find((origin) => normalize(origin.region) === key && cleanName(origin.country));
  return known ? sameCountryKey(known.country) : '';
}

// Region names to offer while typing `query`. Regions of `country` come first; `knownOrigins` are the
// { region, country } pairs of wines in the cellar.
export function suggestRegions(query, country, knownOrigins = [], options) {
  const wanted = cleanName(country) ? sameCountryKey(country) : '';
  const names = uniqueBy(
    [...REGIONS.map(([region]) => region), ...knownOrigins.map((origin) => origin.region)].map(cleanName),
    normalize,
  );
  return rankSuggestions(query, names.map((name) => ({
    name,
    group: wanted && regionCountryKey(name, knownOrigins) !== wanted ? 1 : 0,
  })), options);
}

// The country to fill in for `region` (cellar spelling or UI language), '' when unknown.
export function regionCountry(region, knownOrigins = [], { lang = 'de' } = {}) {
  const key = regionCountryKey(region, knownOrigins);
  if (!key) return '';
  const knownCountries = knownOrigins.map((origin) => origin.country);
  if (BY_CODE.has(key)) return countryName(key, knownCountries, lang);
  return cleanName(knownOrigins.find((origin) => normalize(origin.region) === normalize(region)).country);
}

// When `region` is known to lie in a country other than `country`: that country's name, else ''.
export function regionCountryMismatch(region, country, knownOrigins = [], options) {
  if (!cleanName(country)) return '';
  const key = regionCountryKey(region, knownOrigins);
  return key && key !== sameCountryKey(country) ? regionCountry(region, knownOrigins, options) : '';
}
