import { ENGINES, detectDevice } from './engines.js';
import { FIELDS, scoreResult } from './score.js';

const FIELD_LABELS = { name: 'Wein', producer: 'Produzent', vintage: 'Jahrgang', region: 'Region' };
const $ = (selector) => document.querySelector(selector);

const state = {
  device: { webgpu: false, f16: false },
  photos: [], // { key, file, url, expected }
  results: {}, // engineId -> { loadMs, error, perPhoto: { key: { text, ms, error, score } } }
  running: false,
};

function photoKey(file) {
  return `${file.name}:${file.size}`;
}

function loadExpected(key) {
  try {
    return JSON.parse(localStorage.getItem(`expected:${key}`)) || {};
  } catch {
    return {};
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function renderDevice() {
  const { webgpu, f16 } = state.device;
  $('#device').textContent = `WebGPU: ${webgpu ? 'ja' : 'nein'} · shader-f16: ${f16 ? 'ja' : 'nein'} · ${navigator.userAgent}`;
}

function renderEngines() {
  $('#engines').innerHTML = ENGINES.map((engine) => {
    const disabled = engine.requiresWebGPU && !state.device.webgpu;
    return `<label class="engine${disabled ? ' disabled' : ''}">
      <input type="checkbox" value="${engine.id}" ${disabled ? 'disabled' : engine.id === 'qwen3vl' ? '' : 'checked'}>
      <span><strong>${engine.label}</strong> <small>${engine.download}</small><br><small>${engine.note}</small></span>
    </label>`;
  }).join('');
}

function renderPhotos() {
  $('#photos').innerHTML = state.photos.map((photo, index) => `
    <div class="photo">
      <img src="${photo.url}" alt="">
      <div class="expected">
        <small>${escapeHtml(photo.file.name)}</small>
        ${FIELDS.map((field) => `<input data-index="${index}" data-field="${field}" placeholder="${FIELD_LABELS[field]} (erwartet)" value="${escapeHtml(photo.expected[field] || '')}">`).join('')}
      </div>
    </div>`).join('');
}

function cell(result) {
  if (!result) return '<td class="pending">–</td>';
  if (result.error) return `<td class="error">Fehler<details><summary>Details</summary><pre>${escapeHtml(result.error)}</pre></details></td>`;
  const { hits, total, fields } = result.score;
  const marks = FIELDS.filter((f) => fields[f] !== null).map((f) => `<span class="${fields[f] ? 'hit' : 'miss'}">${FIELD_LABELS[f]}</span>`).join(' ');
  return `<td><strong>${total ? `${hits}/${total}` : 'n/a'}</strong> · ${(result.ms / 1000).toFixed(1)} s<div>${marks}</div>
    <details><summary>Text</summary><pre>${escapeHtml(result.text)}</pre></details></td>`;
}

function renderResults() {
  const engines = ENGINES.filter((engine) => state.results[engine.id]);
  if (!engines.length) {
    $('#results').innerHTML = '';
    return;
  }
  const head = `<tr><th>Foto</th>${engines.map((e) => `<th>${e.label}</th>`).join('')}</tr>`;
  const rows = state.photos.map((photo) => `<tr><td><img src="${photo.url}" alt=""></td>${engines.map((e) => cell(state.results[e.id].perPhoto[photo.key])).join('')}</tr>`).join('');
  const summary = engines.map((engine) => {
    const result = state.results[engine.id];
    if (result.error) return `<td class="error">Laden fehlgeschlagen<pre>${escapeHtml(result.error)}</pre></td>`;
    const done = Object.values(result.perPhoto).filter((r) => !r.error);
    const hits = done.reduce((sum, r) => sum + r.score.hits, 0);
    const total = done.reduce((sum, r) => sum + r.score.total, 0);
    const avg = done.length ? done.reduce((sum, r) => sum + r.ms, 0) / done.length / 1000 : 0;
    return `<td><strong>${total ? Math.round((hits / total) * 100) : 0} %</strong> (${hits}/${total})<br>Ø ${avg.toFixed(1)} s/Foto<br>Laden ${((result.loadMs || 0) / 1000).toFixed(0)} s</td>`;
  }).join('');
  $('#results').innerHTML = `<table>${head}<tr class="summary"><th>Gesamt</th>${summary}</tr>${rows}</table>`;
}

function setStatus(message) {
  $('#status').textContent = message;
}

function rescore() {
  for (const result of Object.values(state.results)) {
    for (const photo of state.photos) {
      const entry = result.perPhoto[photo.key];
      if (entry && !entry.error) entry.score = scoreResult(photo.expected, entry.text);
    }
  }
  renderResults();
}

async function run() {
  if (state.running || !state.photos.length) return;
  const selected = [...document.querySelectorAll('#engines input:checked')].map((input) => input.value);
  state.running = true;
  $('#run').disabled = true;
  for (const engine of ENGINES.filter((e) => selected.includes(e.id))) {
    const result = { perPhoto: {} };
    state.results[engine.id] = result;
    renderResults();
    let runner;
    const loadStart = performance.now();
    try {
      setStatus(`${engine.label}: lade …`);
      runner = await engine.load({ device: state.device, onProgress: (m) => setStatus(`${engine.label}: ${m}`) });
      result.loadMs = performance.now() - loadStart;
    } catch (error) {
      result.error = `${error?.message || error}`;
      console.error(error);
      renderResults();
      continue;
    }
    for (const [index, photo] of state.photos.entries()) {
      setStatus(`${engine.label}: Foto ${index + 1}/${state.photos.length} …`);
      const start = performance.now();
      try {
        const text = await runner.run(photo.file);
        result.perPhoto[photo.key] = { text, ms: performance.now() - start, score: scoreResult(photo.expected, text) };
      } catch (error) {
        console.error(error);
        result.perPhoto[photo.key] = { error: `${error?.message || error}`, ms: performance.now() - start };
      }
      renderResults();
    }
    try {
      await runner.dispose();
    } catch (error) {
      console.warn('dispose failed', error);
    }
  }
  state.running = false;
  $('#run').disabled = false;
  setStatus('Fertig.');
}

function exportJson() {
  const payload = {
    createdAt: new Date().toISOString(),
    device: { ...state.device, userAgent: navigator.userAgent },
    photos: state.photos.map((p) => ({ file: p.file.name, expected: p.expected })),
    results: Object.fromEntries(Object.entries(state.results).map(([id, r]) => [id, {
      loadMs: r.loadMs,
      error: r.error,
      perPhoto: Object.fromEntries(state.photos.map((p) => [p.file.name, r.perPhoto[p.key]])),
    }])),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `label-ocr-results-${Date.now()}.json`;
  link.click();
}

$('#files').addEventListener('change', (event) => {
  for (const photo of state.photos) URL.revokeObjectURL(photo.url);
  state.photos = [...event.target.files].map((file) => {
    const key = photoKey(file);
    return { key, file, url: URL.createObjectURL(file), expected: loadExpected(key) };
  });
  state.results = {};
  renderPhotos();
  renderResults();
});

$('#photos').addEventListener('input', (event) => {
  const { index, field } = event.target.dataset;
  if (index === undefined) return;
  const photo = state.photos[Number(index)];
  photo.expected[field] = event.target.value;
  localStorage.setItem(`expected:${photo.key}`, JSON.stringify(photo.expected));
  rescore();
});

$('#run').addEventListener('click', run);
$('#export').addEventListener('click', exportJson);

window.__labelOcr = state; // for automated smoke tests
state.device = await detectDevice();
renderDevice();
renderEngines();
