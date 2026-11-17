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

/** Votes are anonymous: no name is stored, only the random account id that keeps one vote per meal. */
export async function castVote(uid, date, meal, location) {
  const { db: store, dbApi } = await db();
  await dbApi.setDoc(dbApi.doc(store, 'votes', `${uid}_${date}_${meal}`), { uid, date, meal, location, createdAt: Date.now() });
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
