import test from 'node:test';
import assert from 'node:assert/strict';
import { getCountryFlagEmoji } from './countryFlag.js';

test('maps common wine-producing countries to their flag emoji', () => {
  assert.equal(getCountryFlagEmoji('France'), '🇫🇷');
  assert.equal(getCountryFlagEmoji('Deutschland'), '🇩🇪');
  assert.equal(getCountryFlagEmoji('DE'), '🇩🇪');
  assert.equal(getCountryFlagEmoji('New Zealand'), '🇳🇿');
});

test('normalizes country names and supports alternate names', () => {
  assert.equal(getCountryFlagEmoji('  Côte d’Ivoire  '), '🇨🇮');
  assert.equal(getCountryFlagEmoji('England'), '🇬🇧');
  assert.equal(getCountryFlagEmoji('UK'), '🇬🇧');
});

test('returns an empty string for blank or unrecognized country names', () => {
  assert.equal(getCountryFlagEmoji(''), '');
  assert.equal(getCountryFlagEmoji('Atlantis'), '');
});
