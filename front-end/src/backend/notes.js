/**
 * Public dish notes on Firestore, the community log:
 *
 *   dishes/{dishId}/notes/{uid}  { uid, name, bucket, text, dish, hall, createdAt, updatedAt }
 *
 * One note per person per dish, written only by someone who has ranked the
 * dish, and labelled with that ranking's bucket. Anyone can read them; the
 * campus feed reads the newest across every dish.
 */
import { firebase } from './firebase.js';

export const NOTE_MAX = 280;

async function db() {
  const fb = await firebase();
  if (!fb) throw new Error('Accounts are not set up on this copy of the site.');
  return fb;
}

const fromSnap = d => ({ id: d.ref.path, dishId: d.ref.parent.parent?.id ?? null, ...d.data() });

/** "Alex Rivera" -> "Alex R.": how a note is signed in public. */
export function publicName(name, email) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`.slice(0, 40);
  if (parts.length === 1) return parts[0].slice(0, 40);
  return (String(email || '').split('@')[0] || 'Student').slice(0, 40);
}

/** The newest notes on one dish. */
export async function getDishNotes(dishId, max = 20) {
  const fb = await firebase();
  if (!fb) return [];
  const { db: store, dbApi } = fb;
  const snap = await dbApi.getDocs(dbApi.query(dbApi.collection(store, 'dishes', dishId, 'notes'), dbApi.orderBy('updatedAt', 'desc'), dbApi.limit(max)));
  return snap.docs.map(fromSnap);
}

/** The newest notes across campus, for the feed. */
export async function getRecentNotes(max = 40) {
  const fb = await firebase();
  if (!fb) return [];
  const { db: store, dbApi } = fb;
  const snap = await dbApi.getDocs(dbApi.query(dbApi.collectionGroup(store, 'notes'), dbApi.orderBy('updatedAt', 'desc'), dbApi.limit(max)));
  return snap.docs.map(fromSnap);
}

/** Post or edit your note on a dish you have ranked. */
export async function saveNote(user, dish, { text, bucket, createdAt = null }) {
  const { db: store, dbApi } = await db();
  const clean = String(text ?? '').trim().slice(0, NOTE_MAX);
  if (!clean) throw new Error('Write a few words first.');
  const now = Date.now();
  const note = {
    uid: user.id, name: publicName(user.name, user.email), bucket, text: clean,
    dish: dish.name, hall: dish.hall, createdAt: createdAt ?? now, updatedAt: now,
  };
  try {
    await dbApi.setDoc(dbApi.doc(store, 'dishes', dish.id, 'notes', user.id), note);
  } catch (err) {
    throw new Error(err?.code === 'permission-denied' ? 'Rank this dish first, with a verified Northeastern account.' : 'Your note was not saved. Try again.');
  }
  return { id: `dishes/${dish.id}/notes/${user.id}`, dishId: dish.id, ...note };
}

export async function deleteNote(uid, dishId) {
  const { db: store, dbApi } = await db();
  await dbApi.deleteDoc(dbApi.doc(store, 'dishes', dishId, 'notes', uid));
}

/** Your own note on a dish, or null. */
export async function getMyNote(dishId, uid) {
  const fb = await firebase();
  if (!fb || !uid) return null;
  const { db: store, dbApi } = fb;
  const snap = await dbApi.getDoc(dbApi.doc(store, 'dishes', dishId, 'notes', uid)).catch(() => null);
  return snap?.exists() ? fromSnap(snap) : null;
}
