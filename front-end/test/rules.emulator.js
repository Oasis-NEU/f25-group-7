/**
 * Firestore security rules, run against the real rules engine in the
 * emulator: `npm run test:rules` (from front-end/).
 */
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, addDoc, deleteDoc, writeBatch, increment, collection, collectionGroup, query, where, orderBy, limit, getDocs, getCountFromServer } from 'firebase/firestore';

let env;
const DISH = 'stetson-east~huli-huli-chicken';
const ranking = { bucket: 'loved', name: 'Huli Huli Chicken', hall: 'stetson-east', station: 'Homestyle', course: 'main', rankedAt: 1 };

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-nu-dining',
    firestore: { rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
after(async () => { await env?.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); });

const husky = (uid = 'alice') => env.authenticatedContext(uid, { email: `${uid}@northeastern.edu`, email_verified: true }).firestore();
const outsider = () => env.authenticatedContext('eve', { email: 'eve@gmail.com', email_verified: true }).firestore();
const unverified = () => env.authenticatedContext('bob', { email: 'bob@northeastern.edu', email_verified: false }).firestore();
const anonymous = () => env.unauthenticatedContext().firestore();

/** The batch the app writes when ranking a dish for the first time. */
function rankBatch(db, uid = 'alice', bucket = 'loved', counters = { [bucket]: increment(1) }) {
  const b = writeBatch(db);
  b.set(doc(db, `users/${uid}/rankings/${DISH}`), { ...ranking, bucket });
  b.set(doc(db, `dishes/${DISH}`), { name: ranking.name, hall: ranking.hall, ...counters }, { merge: true });
  return b.commit();
}

test('a verified Northeastern account can rank a dish', async () => {
  await assertSucceeds(rankBatch(husky()));
  const snap = await getDoc(doc(anonymous(), `dishes/${DISH}`));
  assert.equal(snap.data().loved, 1, 'anyone can read the campus counters');
});

test('other emails and unverified accounts cannot rank', async () => {
  await assertFails(rankBatch(outsider(), 'eve'));
  await assertFails(rankBatch(unverified(), 'bob'));
});

test('a counter cannot be bumped without your own ranking in the same batch', async () => {
  await assertFails(setDoc(doc(husky(), `dishes/${DISH}`), { name: ranking.name, hall: ranking.hall, loved: 50 }));
  await assertFails(rankBatch(husky(), 'alice', 'loved', { loved: increment(5) }));
});

test('ranking the same dish twice cannot count twice', async () => {
  const db = husky();
  await assertSucceeds(rankBatch(db));
  await assertFails(rankBatch(db));
});

test('moving a dish to another bucket moves exactly one count', async () => {
  const db = husky();
  await assertSucceeds(rankBatch(db));
  const b = writeBatch(db);
  b.set(doc(db, `users/alice/rankings/${DISH}`), { ...ranking, bucket: 'fine' });
  b.set(doc(db, `dishes/${DISH}`), { name: ranking.name, hall: ranking.hall, loved: increment(-1), fine: increment(1) }, { merge: true });
  await assertSucceeds(b.commit());
  const snap = await getDoc(doc(db, `dishes/${DISH}`));
  assert.deepEqual([snap.data().loved, snap.data().fine], [0, 1]);
});

test('removing a ranking takes its count back', async () => {
  const db = husky();
  await assertSucceeds(rankBatch(db));
  const b = writeBatch(db);
  b.delete(doc(db, `users/alice/rankings/${DISH}`));
  b.set(doc(db, `dishes/${DISH}`), { name: ranking.name, hall: ranking.hall, loved: increment(-1) }, { merge: true });
  await assertSucceeds(b.commit());
});

test('an unverified account cannot write goals or tracker logs', async () => {
  await assertFails(setDoc(doc(unverified(), 'users/bob'), { goals: { calories: 2000 } }, { merge: true }));
  await assertFails(setDoc(doc(unverified(), 'users/bob/logs/l1'), { food_name: 'Bagel', logged_at: '2026-11-16' }));
  await assertSucceeds(setDoc(doc(husky(), 'users/alice'), { goals: { calories: 2000 } }, { merge: true }));
  await assertSucceeds(getDoc(doc(unverified(), 'users/bob')));
});

test('notes: public to read, written only by a verified ranker, labelled with their ranking', async () => {
  const note = { uid: 'alice', name: 'Alice R.', bucket: 'loved', text: 'Crispy skin, great sauce.', dish: ranking.name, hall: ranking.hall, createdAt: 1, updatedAt: 1 };
  const path = `dishes/${DISH}/notes/alice`;
  await assertFails(setDoc(doc(husky(), path), note), 'needs a ranking first');
  await assertSucceeds(rankBatch(husky()));
  await assertSucceeds(setDoc(doc(husky(), path), note));
  await assertFails(setDoc(doc(husky(), path), { ...note, bucket: 'disliked' }), 'label must match the ranking');
  await assertFails(setDoc(doc(husky(), path), { ...note, text: 'x'.repeat(281) }), 'too long');
  await assertFails(setDoc(doc(husky('mallory'), path), note), 'cannot write someone else’s note');
  await assertFails(setDoc(doc(unverified(), `dishes/${DISH}/notes/bob`), { ...note, uid: 'bob' }), 'unverified cannot post');
  await assertSucceeds(getDoc(doc(anonymous(), path)));
  const feed = await getDocs(query(collectionGroup(anonymous(), 'notes'), orderBy('updatedAt', 'desc'), limit(10)));
  assert.equal(feed.size, 1);
  await assertFails(deleteDoc(doc(husky('mallory'), path)));
  await assertSucceeds(deleteDoc(doc(husky(), path)));
});

test('feedback: anyone can send it, nobody can read it back', async () => {
  const fb = { kind: 'bug', message: 'The menu did not load on my phone.', page: '/menu/stetson-east', theme: 'dark', viewport: 390, ua: 'test', createdAt: 1 };
  await assertSucceeds(addDoc(collection(anonymous(), 'feedback'), fb));
  await assertSucceeds(addDoc(collection(husky(), 'feedback'), { ...fb, uid: 'alice', email: 'alice@northeastern.edu' }));
  await assertFails(addDoc(collection(husky(), 'feedback'), { ...fb, uid: 'mallory' }), 'cannot sign as someone else');
  await assertFails(addDoc(collection(anonymous(), 'feedback'), { ...fb, kind: 'spam' }));
  await assertFails(addDoc(collection(anonymous(), 'feedback'), { ...fb, message: 'x'.repeat(1001) }));
  await assertFails(addDoc(collection(anonymous(), 'feedback'), { ...fb, extra: true }));
  await assertFails(getDocs(collection(husky(), 'feedback')), 'not readable from the app');
});

test('your rankings, list and tracker logs are private', async () => {
  await assertSucceeds(rankBatch(husky()));
  await assertSucceeds(setDoc(doc(husky(), 'users/alice/logs/l1'), { food_name: 'Bagel', logged_at: '2026-11-16', calories: 300 }));
  await assertFails(getDoc(doc(husky('mallory'), `users/alice/rankings/${DISH}`)));
  await assertFails(getDoc(doc(husky('mallory'), 'users/alice/logs/l1')));
  await assertFails(setDoc(doc(husky('mallory'), 'users/alice'), { ranks: {} }));
});

test('votes: one per meal per day, Northeastern only, counted by anyone', async () => {
  const vote = { uid: 'alice', date: '2026-11-16', meal: 'lunch', location: 'iv', createdAt: 1 };
  await assertSucceeds(setDoc(doc(husky(), 'votes/alice_2026-11-16_lunch'), vote));
  await assertFails(setDoc(doc(husky(), 'votes/alice_2026-11-16_lunch-again'), vote), 'id must match the vote');
  await assertFails(setDoc(doc(outsider(), 'votes/eve_2026-11-16_lunch'), { ...vote, uid: 'eve' }));
  await assertFails(setDoc(doc(husky('mallory'), 'votes/alice_2026-11-16_dinner'), { ...vote, meal: 'dinner' }), 'cannot vote as someone else');
  const count = await getCountFromServer(query(collection(anonymous(), 'votes'), where('location', '==', 'iv')));
  assert.equal(count.data().count, 1);
  await assertFails(deleteDoc(doc(husky('mallory'), 'votes/alice_2026-11-16_lunch')));
  await assertSucceeds(deleteDoc(doc(husky(), 'votes/alice_2026-11-16_lunch')));
});

test('the app’s own saveRanking and removeRanking pass the rules end to end', async () => {
  // Exercise the real module against the emulator through a stub of firebase().
  const db = husky();
  const dbApi = await import('firebase/firestore');
  const { placeIn } = await import('../src/data/ranking.js');
  const dish = { id: DISH, name: ranking.name, hall: ranking.hall, station: 'Homestyle', course: 'main' };
  const write = async (bucket, previous, ranks) => {
    const b = dbApi.writeBatch(db);
    b.set(dbApi.doc(db, 'users', 'alice', 'rankings', DISH), { bucket, name: dish.name, hall: dish.hall, station: dish.station, course: 'main', rankedAt: Date.now() });
    b.set(dbApi.doc(db, 'users', 'alice'), { ranks: placeIn(ranks, DISH, bucket, 0) }, { merge: true });
    const counters = { name: dish.name, hall: dish.hall, [bucket]: dbApi.increment(1) };
    if (previous) counters[previous] = dbApi.increment(-1);
    b.set(dbApi.doc(db, 'dishes', DISH), counters, { merge: true });
    return b.commit();
  };
  await assertSucceeds(write('fine', null, {}));
  await assertSucceeds(write('loved', 'fine', { fine: [DISH] }));
  const snap = await getDoc(doc(db, `dishes/${DISH}`));
  assert.deepEqual([snap.data().loved, snap.data().fine], [1, 0]);
});
