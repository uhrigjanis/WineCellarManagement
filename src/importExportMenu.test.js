import test from 'node:test';
import assert from 'node:assert/strict';
import { transitionImportExportMenu } from './importExportMenu.js';

test('opens the primary menu and toggles it closed from the trigger', () => {
  assert.equal(transitionImportExportMenu('closed', { type: 'toggle-main' }), 'main');
  assert.equal(transitionImportExportMenu('main', { type: 'toggle-main' }), 'closed');
  assert.equal(transitionImportExportMenu('export', { type: 'toggle-main' }), 'closed');
});

test('opens the export submenu from the primary menu and can return to it', () => {
  assert.equal(transitionImportExportMenu('main', { type: 'open-export' }), 'export');
  assert.equal(transitionImportExportMenu('export', { type: 'back-to-main' }), 'main');
  assert.equal(transitionImportExportMenu('closed', { type: 'open-export' }), 'closed');
});

test('closes either menu on Escape or an outside click', () => {
  for (const state of ['main', 'export']) {
    assert.equal(transitionImportExportMenu(state, { type: 'escape' }), 'closed');
    assert.equal(transitionImportExportMenu(state, { type: 'outside-click' }), 'closed');
  }
});
