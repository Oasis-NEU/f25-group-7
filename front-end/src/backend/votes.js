/**
 * Steast vs IV votes on Firestore: one document per person per meal per day,
 * id "<uid>_<date>_<meal>", so the database itself enforces one vote. Totals
 * use count queries, which cost one read per thousand votes counted.
 */
import { firebase } from './firebase.js';

async function db() {
  const fb = await firebase();
  if (!fb) throw new Error('Accounts are not set up on this copy of the site.');
  return fb;
}

export async function getTotals() {
  const { db: store, dbApi } = await db();
  const votes = dbApi.collection(store, 'votes');
  const [steast, iv] = await Promise.all(['steast', 'iv'].map(location =>
    dbApi.getCount(dbApi.query(votes, dbApi.where('location', '==', location)))));
  return { steast: steast.data().count, iv: iv.data().count };
}

/** The meals this person has already voted in on a date. */
export async function getMyMeals(uid, date) {
  const { db: store, dbApi } = await db();
  const snap = await dbApi.getDocs(dbApi.query(dbApi.collection(store, 'votes'), dbApi.where('uid', '==', uid), dbApi.where('date', '==', date)));
  return snap.docs.map(d => d.data().meal);
}

/** `name` is the public signature ("Alex R."): votes are public, like the totals. */
export async function castVote(uid, date, meal, location, name = '') {
  const { db: store, dbApi } = await db();
  await dbApi.setDoc(dbApi.doc(store, 'votes', `${uid}_${date}_${meal}`), { uid, date, meal, location, name: String(name).slice(0, 40), createdAt: Date.now() });
}

/** The newest votes on campus, for the public feed. */
export async function getRecentVotes(max = 15) {
  const { db: store, dbApi } = await db();
  const snap = await dbApi.getDocs(dbApi.query(dbApi.collection(store, 'votes'), dbApi.orderBy('createdAt', 'desc'), dbApi.limit(max)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function undoVote(uid, date, meal) {
  const { db: store, dbApi } = await db();
  await dbApi.deleteDoc(dbApi.doc(store, 'votes', `${uid}_${date}_${meal}`));
}
