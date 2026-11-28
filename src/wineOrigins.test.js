import test from 'node:test';
import assert from 'node:assert/strict';
import { getCountryCode, regionCountry, regionCountryMismatch, suggestCountries, suggestRegions } from './wineOrigins.js';

test('resolves German, English, alias and ISO country names to a code', () => {
  assert.equal(getCountryCode('Österreich'), 'AT');
  assert.equal(getCountryCode('austria'), 'AT');
  assert.equal(getCountryCode('oesterreich'), 'AT');
  assert.equal(getCountryCode('Argentinien'), 'AR');
  assert.equal(getCountryCode('Italia'), 'IT');
  assert.equal(getCountryCode('de'), 'DE');
  assert.equal(getCountryCode('Narnia'), '');
});

test('suggests countries ignoring case and umlauts, in the UI language', () => {
  assert.equal(suggestCountries('oster')[0], 'Österreich');
  assert.equal(suggestCountries('austria')[0], 'Österreich');
  assert.equal(suggestCountries('austria', [], { lang: 'en' })[0], 'Austria');
  assert.equal(suggestCountries('osterr', [], { lang: 'en' })[0], 'Austria');
  assert.equal(suggestCountries('sudaf')[0], 'Südafrika');
});

test('ranks matches at the start of a word before matches inside the name', () => {
  assert.deepEqual(suggestCountries('ru', [], { lang: 'en' }), ['Russia', 'Cyprus', 'Peru', 'Uruguay', 'Romania']);
  assert.equal(suggestCountries('africa', [], { lang: 'en' })[0], 'South Africa');
  assert.equal(suggestCountries('fra')[0], 'Frankreich');
});

test('uses the spelling the cellar already uses for a country', () => {
  assert.deepEqual(suggestCountries('fra', ['France']), ['France']);
  assert.equal(suggestCountries('deu', ['Deutschland'], { lang: 'en' })[0], 'Deutschland');
});

test('suggests countries from the cellar that are not in the list', () => {
  assert.deepEqual(suggestCountries('narn', ['Narnia']), ['Narnia']);
  assert.deepEqual(suggestCountries('xyz'), []);
});

test('suggests regions of the chosen country first, then the rest', () => {
  assert.deepEqual(suggestRegions('rhe', 'Deutschland').slice(0, 3), ['Rheingau', 'Rheinhessen', 'Mittelrhein']);
  assert.equal(suggestRegions('bo', 'Frankreich')[0], 'Bordeaux');
  assert.equal(suggestRegions('bo', 'France')[0], 'Bordeaux');
  const fromGermany = suggestRegions('bo', 'Deutschland');
  assert.ok(fromGermany.includes('Bordeaux'), 'other countries are still offered');
  assert.equal(suggestRegions('bur', 'Österreich')[0], 'Burgenland');
});

test('suggests regions of every country when no country is set', () => {
  assert.equal(suggestRegions('mosel', '')[0], 'Mosel');
  assert.equal(suggestRegions('saint em', '')[0], 'Saint-Émilion');
});

test('suggests regions from the cellar together with their country', () => {
  const known = [{ region: 'Malokarpatská', country: 'Slovakia' }, { region: 'Burgenland', country: 'Austria' }];
  assert.deepEqual(suggestRegions('malo', 'Slowakei', known), ['Malokarpatská']);
  assert.deepEqual(suggestRegions('burgenl', '', known), ['Burgenland']);
});

test('finds the country of a region in the cellar spelling or UI language', () => {
  assert.equal(regionCountry('Bordeaux'), 'Frankreich');
  assert.equal(regionCountry('Bordeaux', [], { lang: 'en' }), 'France');
  assert.equal(regionCountry('Bordeaux', [{ region: 'Champagne', country: 'France' }]), 'France');
  assert.equal(regionCountry('Malokarpatská', [{ region: 'Malokarpatská', country: 'Slovakia' }]), 'Slovakia');
  assert.equal(regionCountry('Nowhere'), '');
});

test('the region list wins over a wrong country stored in the cellar', () => {
  assert.equal(regionCountry('Bordeaux', [{ region: 'Bordeaux', country: 'Deutschland' }, { region: 'Margaux', country: 'France' }]), 'France');
});

test('reports a region that belongs to a different country', () => {
  assert.equal(regionCountryMismatch('Bordeaux', 'Deutschland'), 'Frankreich');
  assert.equal(regionCountryMismatch('Bordeaux', 'France'), '');
  assert.equal(regionCountryMismatch('Bordeaux', ''), '');
  assert.equal(regionCountryMismatch('Somewhere', 'Deutschland'), '');
  assert.equal(regionCountryMismatch('Bordeaux', 'Germany', [], { lang: 'en' }), 'France');
});
