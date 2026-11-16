/**
 * Dish rankings, after Beli: sort a dish into a bucket, then place it with a
 * few "which did you like more?" questions. Pure functions only; storage
 * lives in backend/ranks.js.
 *
 * Unlike Beli, a dish is only compared with dishes of the same course (a
 * dessert against desserts, an entrée against entrées), which fixes the
 * forced apples-to-oranges comparisons Beli is criticised for.
 */
import { dishKey } from './curate.js';
import { slugify } from './halls.js';

export const BUCKETS = [
  { key: 'loved', label: 'Loved it', range: [6.8, 10], points: 8.5 },
  { key: 'fine', label: 'It was fine', range: [3.4, 6.7], points: 5 },
  { key: 'disliked', label: 'Didn’t like it', range: [0, 3.3], points: 1.5 },
];

export const bucketOf = key => BUCKETS.find(b => b.key === key) ?? null;

/** One id per dish per hall, stable across days ("stetson-east~huli-huli-chicken"). */
export function dishId(hallSlug, name) {
  return `${hallSlug}~${slugify(dishKey(name))}`.slice(0, 200);
}

/** Desserts and bakery compare with each other; everything else is a main. */
export function courseOf(item) {
  return item?.course ?? (item?.stationKind === 'sweets' ? 'sweet' : 'main');
}

/** A personal score from a dish's place in its bucket: the top of the bucket scores highest. */
export function scoreAt(bucketKey, index, length) {
  const bucket = bucketOf(bucketKey);
  if (!bucket || length < 1) return null;
  const [lo, hi] = bucket.range;
  if (length === 1) return Math.round(((lo + hi) / 2) * 10) / 10;
  return Math.round((hi - ((hi - lo) * index) / (length - 1)) * 10) / 10;
}

/** Every ranked dish with its personal score, best first. */
export function scoredList(ranks, details = {}) {
  const out = [];
  for (const bucket of BUCKETS) {
    const ids = ranks?.[bucket.key] ?? [];
    ids.forEach((id, index) => out.push({ id, bucket: bucket.key, score: scoreAt(bucket.key, index, ids.length), ...(details[id] ?? {}) }));
  }
  return out;
}

/**
 * A placement session: binary search over the same-course dishes already in
 * the bucket. `compare()` names the dish to ask about next; `answer()` takes
 * 'new' (the new dish is better), 'old' (the existing one is better) or
 * 'tie' (too tough to say). When `done` is true, `insertAt` is the index in
 * the bucket's full list.
 */
export function startPlacement({ bucketIds, candidateIds }) {
  const pool = candidateIds.filter(id => bucketIds.includes(id));
  return { bucketIds, pool, lo: 0, hi: pool.length, asked: 0, done: pool.length === 0, insertAt: pool.length === 0 ? bucketIds.length : null };
}

export function nextComparison(state) {
  if (state.done) return null;
  return state.pool[Math.floor((state.lo + state.hi) / 2)];
}

export function answer(state, choice) {
  if (state.done) return state;
  const mid = Math.floor((state.lo + state.hi) / 2);
  let { lo, hi } = state;
  if (choice === 'new') hi = mid;
  else if (choice === 'old') lo = mid + 1;
  else { lo = mid; hi = mid; }
  const asked = state.asked + 1;
  if (lo < hi) return { ...state, lo, hi, asked };
  // Place relative to the same-course neighbour, inside the full bucket list.
  const before = state.pool[lo];
  const insertAt = before ? state.bucketIds.indexOf(before) : (() => {
    const last = state.pool[state.pool.length - 1];
    return last ? state.bucketIds.indexOf(last) + 1 : state.bucketIds.length;
  })();
  return { ...state, lo, hi, asked, done: true, insertAt };
}

/** The bucket lists after placing (or re-placing) a dish. */
export function placeIn(ranks, id, bucketKey, insertAt) {
  const next = {};
  for (const bucket of BUCKETS) next[bucket.key] = (ranks?.[bucket.key] ?? []).filter(x => x !== id);
  const list = next[bucketKey];
  const at = Math.max(0, Math.min(insertAt ?? list.length, list.length));
  list.splice(at, 0, id);
  return next;
}

export function removeFrom(ranks, id) {
  const next = {};
  for (const bucket of BUCKETS) next[bucket.key] = (ranks?.[bucket.key] ?? []).filter(x => x !== id);
  return next;
}

/** Fewer rankings than this and a dish has no campus score yet. */
export const CAMPUS_MIN = 3;

/**
 * The campus score: each ranking counts as its bucket's points, averaged with
 * a pull towards the middle (three phantom "fine" votes) so a dish with two
 * glowing rankings does not top a dish with forty good ones.
 */
export function campusScore(stats) {
  const loved = stats?.loved ?? 0;
  const fine = stats?.fine ?? 0;
  const disliked = stats?.disliked ?? 0;
  const count = loved + fine + disliked;
  const split = { loved, fine, disliked };
  if (count < CAMPUS_MIN) return { score: null, count, ...split };
  const prior = 3;
  const sum = loved * 8.5 + fine * 5 + disliked * 1.5 + prior * 5;
  return { score: Math.round((sum / (count + prior)) * 10) / 10, count, ...split };
}
