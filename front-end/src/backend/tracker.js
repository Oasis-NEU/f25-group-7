/**
 * The nutrition tracker on Firestore: goals on users/{uid}, one document per
 * logged food under users/{uid}/logs. Field names match the old food_logs
 * table so the tracker page reads the same shape.
 */
import { firebase } from './firebase.js';

export const DEFAULT_GOALS = { calories_goal: 2000, protein_goal: 150, carbs_goal: 250, fat_goal: 65, fiber_goal: 25 };

async function db() {
  const fb = await firebase();
  if (!fb) throw new Error('Accounts are not set up on this copy of the site.');
  return fb;
}

/** The saved goals, or null when the person has never set any. */
export async function getGoals(uid) {
  const { db: store, dbApi } = await db();
  const snap = await dbApi.getDoc(dbApi.doc(store, 'users', uid));
  return snap.exists() && snap.data().goals ? { ...DEFAULT_GOALS, ...snap.data().goals } : null;
}

export async function saveGoals(uid, goals) {
  const { db: store, dbApi } = await db();
  await dbApi.setDoc(dbApi.doc(store, 'users', uid), { goals, goalsUpdatedAt: dbApi.serverTimestamp() }, { merge: true });
}

/** Logs for a set of campus dates (YYYY-MM-DD), oldest first. */
export async function getLogs(uid, dates) {
  const { db: store, dbApi } = await db();
  const out = [];
  for (let i = 0; i < dates.length; i += 30) {
    const q = dbApi.query(dbApi.collection(store, 'users', uid, 'logs'), dbApi.where('logged_at', 'in', dates.slice(i, i + 30)));
    const snap = await dbApi.getDocs(q);
    snap.forEach(d => out.push({ id: d.id, ...d.data() }));
  }
  return out.sort((a, b) => (a.created ?? 0) - (b.created ?? 0));
}

export async function addLog(uid, entry) {
  const { db: store, dbApi } = await db();
  const { user_id: _ignored, ...fields } = entry;
  const data = { ...fields, created: Date.now() };
  const ref = await dbApi.addDoc(dbApi.collection(store, 'users', uid, 'logs'), data);
  return { id: ref.id, ...data };
}

export async function updateLog(uid, id, updates) {
  const { db: store, dbApi } = await db();
  await dbApi.updateDoc(dbApi.doc(store, 'users', uid, 'logs', id), updates);
}

export async function deleteLog(uid, id) {
  const { db: store, dbApi } = await db();
  await dbApi.deleteDoc(dbApi.doc(store, 'users', uid, 'logs', id));
}
