// End-to-end smoke test for cloud sync against the Firebase Emulator Suite, through the Vite dev server
// proxy (the same path the app uses in GitHub Codespaces). Not part of `npm test`.
// Run with: npm run test:e2e   (needs Java 21 and `npx playwright install chromium`)
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const PROJECT = 'demo-weinkeller';
const FIRESTORE = 'http://127.0.0.1:8080';
const OWNER = { Authorization: 'Bearer owner' }; // emulator-only: bypasses security rules

const localWine = (id, name) => ({
  id,
  name,
  producer: 'Weingut Test',
  vintage: 2021,
  region: 'Pfalz',
  country: 'Deutschland',
  type: 'white',
  qty: 2,
  price: 12.5,
  rating: 4,
  grapes: [{ name: 'Riesling', pct: 100 }],
  alcohol: '12',
  cellar: 'Keller 1',
  drinkFrom: '',
  drinkUntil: '',
  notes: '',
  image: '',
});

const listCloudWines = async () => {
  const response = await fetch(`${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`, {
    method: 'POST',
    headers: { ...OWNER, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'wines', allDescendants: true }] } }),
  });
  const rows = await response.json();
  return rows.filter((row) => row.document).map((row) => row.document);
};

let server;
let browser;
let baseUrl;

before(async () => {
  await fetch(`${FIRESTORE}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
  server = await createServer({ mode: 'emulator', server: { port: 5199, strictPort: true, host: '127.0.0.1' }, logLevel: 'warn' });
  await server.listen();
  baseUrl = 'http://127.0.0.1:5199/';
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  await server?.close();
});

test('sign-in migrates local wines to Firestore and remote changes sync back', { timeout: 120_000 }, async () => {
  const context = await browser.newContext();
  await context.addInitScript((wines) => {
    if (!localStorage.getItem('weinkeller-wines-v2')) localStorage.setItem('weinkeller-wines-v2', JSON.stringify(wines));
  }, [localWine('local-1', 'Smoke Riesling'), localWine('local-2', 'Smoke Silvaner')]);
  const page = await context.newPage();
  page.on('console', (message) => { if (message.type() === 'error') console.log('[browser]', message.text()); });

  await page.goto(baseUrl);
  await page.getByText('Smoke Riesling').waitFor();
  await page.getByTestId('sync-status').getByText('Nur auf diesem Gerät').waitFor();

  // Google sign-in through the Auth emulator's fake account picker.
  const signInButton = page.getByRole('button', { name: 'Mit Google anmelden' });
  await assert.doesNotReject(signInButton.waitFor());
  const [popup] = await Promise.all([page.waitForEvent('popup'), signInButton.click()]);
  // The emulator page keeps hidden copies of its buttons in the DOM, so only act on visible ones.
  const visible = (locator) => locator.filter({ visible: true }).first();
  await visible(popup.getByText('Add new account')).click();
  await visible(popup.getByText('Auto-generate user information')).click();
  await visible(popup.getByText('Sign in with Google.com')).click();

  await page.getByText(/2 Weine aus diesem Browser in die Cloud übernommen, 0 Duplikate übersprungen/).waitFor();
  await page.getByTestId('sync-status').getByText('Synchronisiert').waitFor();

  const cloudWines = await listCloudWines();
  assert.deepEqual(
    cloudWines.map((document) => document.fields.name.stringValue).sort(),
    ['Smoke Riesling', 'Smoke Silvaner'],
  );
  assert.match(cloudWines[0].name, /\/users\/[^/]+\/wines\/local-[12]$/);

  // A change made elsewhere (here: directly in Firestore) shows up live in the app.
  const riesling = cloudWines.find((document) => document.fields.name.stringValue === 'Smoke Riesling');
  const patch = await fetch(`${FIRESTORE}/v1/${riesling.name}?updateMask.fieldPaths=name`, {
    method: 'PATCH',
    headers: { ...OWNER, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { name: { stringValue: 'Smoke Riesling (remote)' } } }),
  });
  assert.equal(patch.status, 200);
  await page.getByText('Smoke Riesling (remote)').waitFor();

  // Reloading does not migrate a second time.
  await page.reload();
  await page.getByText('Smoke Riesling (remote)').waitFor();
  await page.getByTestId('sync-status').getByText('Synchronisiert').waitFor();
  assert.equal((await listCloudWines()).length, 2);
  assert.equal(await page.getByText(/aus diesem Browser in die Cloud übernommen/).count(), 0);

  await context.close();
});
