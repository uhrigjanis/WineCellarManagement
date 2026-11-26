// Security rules tests. They need the Firestore emulator and are therefore not part of `npm test`.
// Run with: npm run test:rules   (starts the emulator, runs this file, stops the emulator)
import test, { after, before, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-weinkeller-rules',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') },
  });
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users/alice/wines/w1'), { name: 'Riesling', qty: 2 });
  });
});

after(async () => {
  await env?.cleanup();
});

const alice = () => env.authenticatedContext('alice').firestore();
const bob = () => env.authenticatedContext('bob').firestore();
const anonymous = () => env.unauthenticatedContext().firestore();

test('owner can read, list, create, update, and delete their wines', async () => {
  const db = alice();
  await assertSucceeds(getDoc(doc(db, 'users/alice/wines/w1')));
  await assertSucceeds(getDocs(collection(db, 'users/alice/wines')));
  await assertSucceeds(setDoc(doc(db, 'users/alice/wines/w2'), { name: 'Silvaner', qty: 1 }));
  await assertSucceeds(setDoc(doc(db, 'users/alice/wines/w1'), { name: 'Riesling', qty: 0 }));
  await assertSucceeds(deleteDoc(doc(db, 'users/alice/wines/w2')));
});

test('another signed-in user cannot read or change the cellar', async () => {
  const db = bob();
  await assertFails(getDoc(doc(db, 'users/alice/wines/w1')));
  await assertFails(getDocs(collection(db, 'users/alice/wines')));
  await assertFails(setDoc(doc(db, 'users/alice/wines/w1'), { name: 'Hacked', qty: 99 }));
  await assertFails(setDoc(doc(db, 'users/alice/wines/new'), { name: 'Planted', qty: 1 }));
  await assertFails(deleteDoc(doc(db, 'users/alice/wines/w1')));
});

test('signed-out visitors have no access', async () => {
  const db = anonymous();
  await assertFails(getDoc(doc(db, 'users/alice/wines/w1')));
  await assertFails(getDocs(collection(db, 'users/alice/wines')));
  await assertFails(setDoc(doc(db, 'users/alice/wines/w3'), { name: 'X', qty: 1 }));
});

test('documents outside users/{uid} are denied', async () => {
  await assertFails(setDoc(doc(alice(), 'wines/w1'), { name: 'Global', qty: 1 }));
  await assertFails(getDocs(collection(alice(), 'users')));
});
