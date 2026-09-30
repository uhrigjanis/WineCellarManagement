const COUNTRY_CODES = {
  argentina: 'AR',
  australia: 'AU',
  austria: 'AT',
  österreich: 'AT',
  belgium: 'BE',
  belgien: 'BE',
  brazil: 'BR',
  brasilien: 'BR',
  bulgaria: 'BG',
  canada: 'CA',
  chile: 'CL',
  china: 'CN',
  croatia: 'HR',
  kroatien: 'HR',
  cyprus: 'CY',
  czechia: 'CZ',
  'czech republic': 'CZ',
  tschechien: 'CZ',
  denmark: 'DK',
  dänemark: 'DK',
  england: 'GB',
  france: 'FR',
  frankreich: 'FR',
  georgia: 'GE',
  germany: 'DE',
  deutschland: 'DE',
  greece: 'GR',
  griechenland: 'GR',
  hungary: 'HU',
  ungarn: 'HU',
  india: 'IN',
  ireland: 'IE',
  irland: 'IE',
  israel: 'IL',
  italy: 'IT',
  italien: 'IT',
  japan: 'JP',
  lebanon: 'LB',
  luxembourg: 'LU',
  mexico: 'MX',
  moldova: 'MD',
  montenegro: 'ME',
  morocco: 'MA',
  maroc: 'MA',
  netherlands: 'NL',
  holland: 'NL',
  niederlande: 'NL',
  'new zealand': 'NZ',
  neuseeland: 'NZ',
  'north macedonia': 'MK',
  peru: 'PE',
  poland: 'PL',
  polen: 'PL',
  portugal: 'PT',
  romania: 'RO',
  russia: 'RU',
  russland: 'RU',
  serbia: 'RS',
  slovakia: 'SK',
  slowakei: 'SK',
  slovenia: 'SI',
  slowenien: 'SI',
  'south africa': 'ZA',
  südafrika: 'ZA',
  'south korea': 'KR',
  spain: 'ES',
  spanien: 'ES',
  sweden: 'SE',
  schweden: 'SE',
  switzerland: 'CH',
  schweiz: 'CH',
  taiwan: 'TW',
  thailand: 'TH',
  turkey: 'TR',
  türkiye: 'TR',
  turkeye: 'TR',
  uk: 'GB',
  'united kingdom': 'GB',
  'great britain': 'GB',
  'vereinigtes königreich': 'GB',
  'united states': 'US',
  'united states of america': 'US',
  usa: 'US',
  uruguay: 'UY',
  ukraine: 'UA',
  'côte d’ivoire': 'CI',
  'cote d ivoire': 'CI',
  'ivory coast': 'CI',
  vietnam: 'VN',
};

const normalizeCountryName = (country) => country
  .trim()
  .toLocaleLowerCase()
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '')
  .replace(/[’'`]/g, '')
  .replace(/[^a-z0-9]/g, '');

const normalizedCountryCodes = new Map(
  Object.entries(COUNTRY_CODES).flatMap(([name, code]) => [
    [normalizeCountryName(name), code],
    [normalizeCountryName(code), code],
  ]),
);

const countryCodeToFlag = (code) => [...code.toUpperCase()]
  .map((letter) => String.fromCodePoint(letter.codePointAt(0) + 127397))
  .join('');

export function getCountryFlagEmoji(country) {
  if (typeof country !== 'string' || !country.trim()) {
    return '';
  }

  const code = normalizedCountryCodes.get(normalizeCountryName(country));
  return code ? countryCodeToFlag(code) : '';
}
