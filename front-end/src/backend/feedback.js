/**
 * In-app feedback, Google Maps style: anyone can send a note, and it lands in
 * the `feedback` collection, readable only from the Firebase console.
 *
 *   feedback/{auto}  { kind, message, page, dish?, theme, viewport, ua, email?, uid?, createdAt }
 */
import { firebase } from './firebase.js';

export const FEEDBACK_MAX = 1000;
export const FEEDBACK_KINDS = [
  { key: 'bug', label: 'Something’s broken', hint: 'What happened, and what did you expect?' },
  { key: 'menu', label: 'Menu or hours wrong', hint: 'Which dish or hall, and what’s wrong: calories, allergens, hours…' },
  { key: 'idea', label: 'Idea', hint: 'What would make NU Dining better for you?' },
  { key: 'other', label: 'Other', hint: 'Tell us anything.' },
];

export async function sendFeedback({ kind, message, dish = '', email = '', user = null }) {
  const fb = await firebase();
  if (!fb) throw new Error('Feedback isn’t set up on this copy of the site.');
  const { db, dbApi } = fb;
  const doc = {
    kind,
    message: String(message).trim().slice(0, FEEDBACK_MAX),
    page: (window.location.pathname + window.location.search).slice(0, 200),
    theme: document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
    viewport: Math.round(window.innerWidth),
    ua: navigator.userAgent.slice(0, 300),
    createdAt: Date.now(),
  };
  if (dish) doc.dish = String(dish).slice(0, 200);
  if (email) doc.email = String(email).trim().slice(0, 120);
  if (user) doc.uid = user.id;
  try {
    await dbApi.addDoc(dbApi.collection(db, 'feedback'), doc);
  } catch (err) {
    console.error('Feedback failed', err?.code, err?.message);
    throw new Error('Your feedback wasn’t sent. Check your connection and try again.');
  }
}
