import test from 'node:test';
import assert from 'node:assert/strict';
import { applyLabelSuggestions } from './labelSuggestions.js';

const defaults = { name: '', producer: '', vintage: 2026, alcohol: '13.5', type: 'red', region: '', country: 'Deutschland' };
let nextId = 0;
const createGrape = () => ({ id: `g${(nextId += 1)}`, name: '', pct: '' });

test('fills empty fields and fields still at their new-wine default', () => {
  const form = { ...defaults, grapes: [createGrape()] };
  const { form: next, filled } = applyLabelSuggestions(form, {
    name: 'Hermannshöhle', producer: 'Weingut Dönnhoff', vintage: 2019, alcohol: '13', type: 'white', region: 'Nahe', country: 'Deutschland', grapes: ['Riesling'],
  }, defaults, createGrape);

  assert.equal(next.name, 'Hermannshöhle');
  assert.equal(next.vintage, 2019);
  assert.equal(next.alcohol, '13');
  assert.equal(next.type, 'white');
  assert.equal(next.grapes[0].name, 'Riesling');
  assert.deepEqual(filled, ['name', 'producer', 'vintage', 'alcohol', 'type', 'region', 'grapes']);
});

test('never overwrites values the user already entered', () => {
  const form = { ...defaults, name: 'Mein Wein', vintage: '2018', grapes: [{ id: 'x', name: 'Merlot', pct: '' }] };
  const { form: next, filled } = applyLabelSuggestions(form, { name: 'Other', vintage: 2019, grapes: ['Riesling'] }, defaults, createGrape);

  assert.equal(next.name, 'Mein Wein');
  assert.equal(next.vintage, '2018');
  assert.equal(next.grapes[0].name, 'Merlot');
  assert.deepEqual(filled, []);
});

test('reports nothing filled for empty suggestions', () => {
  const form = { ...defaults, grapes: [createGrape()] };
  assert.deepEqual(applyLabelSuggestions(form, {}, defaults, createGrape).filled, []);
});
