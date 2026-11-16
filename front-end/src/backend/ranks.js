/**
 * Dish rankings on Firestore.
 *
 *   users/{uid}.ranks              { loved: [dishId…], fine: […], disliked: […] }  best first
 *   users/{uid}/rankings/{dishId}  { bucket, name, hall, station, course, rankedAt }
 *   dishes/{dishId}                { name, hall, loved, fine, disliked }            public counters
 *
 * A ranking is written as one batch (your ranking, your list order, the
 * dish's counters) because the security rules only accept a counter change
 * that matches your own ranking change in the same batch.
 */
import { firebase } from './firebase.js';
import { placeIn, removeFrom } from '../data/ranking.js';

async function db() {
  const fb = await firebase();
  if (!fb) throw new Error('Accounts are not set up on this copy of the site.');
  return fb;
}

/** Your ranked lists and the details of every dish on them. */
export async function getMyRanks(uid) {
  const { db: store, dbApi } = await db();
  const [userSnap, detailSnap] = await Promise.all([
    dbApi.getDoc(dbApi.doc(store, 'users', uid)),
    dbApi.getDocs(dbApi.collection(store, 'users', uid, 'rankings')),
  ]);
  const details = {};
  detailSnap.forEach(d => { details[d.id] = d.data(); });
  const stored = userSnap.exists() ? userSnap.data().ranks ?? {} : {};
  // Keep the order list and the per-dish documents in agreement: a dish with
  // a document but missing from the order goes to the end of its bucket.
  const ranks = { loved: [], fine: [], disliked: [] };
  for (const bucket of Object.keys(ranks)) ranks[bucket] = (stored[bucket] ?? []).filter(id => details[id]?.bucket === bucket);
  for (const [id, d] of Object.entries(details)) if (ranks[d.bucket] && !ranks[d.bucket].includes(id)) ranks[d.bucket].push(id);
  return { ranks, details };
}

/**
 * Rank (or re-rank) a dish. `dish` is { id, name, hall, station, course };
 * `previous` is the bucket it was in before, or null.
 */
export async function saveRanking(uid, { dish, bucket, insertAt, previous, ranks }) {
  const { db: store, dbApi } = await db();
  const batch = dbApi.writeBatch(store);
  const nextRanks = placeIn(ranks, dish.id, bucket, insertAt);

  batch.set(dbApi.doc(store, 'users', uid, 'rankings', dish.id), {
    bucket, name: dish.name, hall: dish.hall, station: dish.stationLabel || dish.station || '', course: dish.course ?? 'main', rankedAt: Date.now(),
  });
  batch.set(dbApi.doc(store, 'users', uid), { ranks: nextRanks }, { merge: true });
  if (previous !== bucket) {
    const counters = { name: dish.name, hall: dish.hall, [bucket]: dbApi.increment(1) };
    if (previous) counters[previous] = dbApi.increment(-1);
    batch.set(dbApi.doc(store, 'dishes', dish.id), counters, { merge: true });
    // A public note carries its ranking's label; move it in the same write.
    if (previous) {
      const noteRef = dbApi.doc(store, 'dishes', dish.id, 'notes', uid);
      const note = await dbApi.getDoc(noteRef).catch(() => null);
      if (note?.exists()) batch.set(noteRef, { bucket }, { merge: true });
    }
  }
  await batch.commit();
  invalidate([dish.id]);
  return nextRanks;
}

export async function removeRanking(uid, { dish, previous, ranks }) {
  const { db: store, dbApi } = await db();
  const batch = dbApi.writeBatch(store);
  const nextRanks = removeFrom(ranks, dish.id);
  batch.delete(dbApi.doc(store, 'users', uid, 'rankings', dish.id));
  batch.set(dbApi.doc(store, 'users', uid), { ranks: nextRanks }, { merge: true });
  batch.set(dbApi.doc(store, 'dishes', dish.id), { name: dish.name, hall: dish.hall, [previous]: dbApi.increment(-1) }, { merge: true });
  // Removing a ranking takes its public note with it.
  batch.delete(dbApi.doc(store, 'dishes', dish.id, 'notes', uid));
  await batch.commit();
  invalidate([dish.id]);
  return nextRanks;
}

/* Campus counters, read in chunks and cached briefly --------------------- */

const CACHE_MS = 5 * 60 * 1000;
const cache = new Map();
const invalidate = ids => ids.forEach(id => cache.delete(id));

/**
 * Campus counters for a set of dish ids: { [id]: { loved, fine, disliked } }.
 * Dishes nobody has ranked are simply absent. Reads at most one query per 30
 * ids, and nothing for ids seen in the last five minutes.
 */
export async function getDishStats(ids) {
  const fb = await firebase();
  if (!fb || !ids.length) return {};
  const now = Date.now();
  const out = {};
  const wanted = [];
  for (const id of new Set(ids)) {
    const hit = cache.get(id);
    if (hit && now - hit.at < CACHE_MS) { if (hit.data) out[id] = hit.data; } else wanted.push(id);
  }
  const { db: store, dbApi } = fb;
  for (let i = 0; i < wanted.length; i += 30) {
    const chunk = wanted.slice(i, i + 30);
    const snap = await dbApi.getDocs(dbApi.query(dbApi.collection(store, 'dishes'), dbApi.where(dbApi.documentId(), 'in', chunk)));
    const found = new Map(snap.docs.map(d => [d.id, d.data()]));
    for (const id of chunk) {
      const data = found.get(id) ?? null;
      cache.set(id, { at: now, data });
      if (data) out[id] = data;
    }
  }
  return out;
}
