import { getCountryCode } from './wineOrigins.js';

const countryCodeToFlag = (code) => [...code.toUpperCase()]
  .map((letter) => String.fromCodePoint(letter.codePointAt(0) + 127397))
  .join('');

export function getCountryFlagEmoji(country) {
  if (typeof country !== 'string' || !country.trim()) {
    return '';
  }

  const code = getCountryCode(country);
  return code ? countryCodeToFlag(code) : '';
}
