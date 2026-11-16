/**
 * Load one hall's menu for one day and meal, from the best source available.
 *
 *   1. DineOnCampus, live from the browser (see dineoncampus.js).
 *   2. Our own /api/menu, which serves what the scraper last stored. Only
 *      useful for today, and only while Supabase is up and someone has run
 *      the scraper recently.
 *   3. The last copy this browser saw for the same hall, day and meal.
 *
 * Every result says which source it came from, so the page can be honest
 * about anything that is not live.
 */
import { fetchPeriod, fetchPeriods, mergeStations, normalizePeriods, normalizeStations, toNumber } from './dineoncampus.js';
import { getJson } from './http.js';
import { hallBySlug, pickCurrentPeriod, slugify } from './halls.js';
import { keysWithPrefix, readJson, removeKey, writeJson } from './storage.js';
import { addDays, campusDate, campusNow } from '../functions/campusTime.js';

const CACHE_PREFIX = 'menu:';
const CACHE_LIMIT = 24;

const cacheKey = (hallSlug, date, mealSlug) => `${CACHE_PREFIX}${hallSlug}:${date}:${mealSlug}`;

/**
 * The copy this browser saved for a hall, day and meal, or null. Used two
 * ways, which must never be confused:
 *   - preview: drawn instantly while the live menu loads. Not a failure, so
 *     the page must not warn about it.
 *   - fallback: what loadMenu returns when DineOnCampus and our API both
 *     failed. That one is labelled, because it may be out of date.
 */
export function peekCachedMenu(hallSlug, date, mealSlug) {
  if (!mealSlug) return null;
  const entry = readJson(cacheKey(hallSlug, date, mealSlug));
  return entry?.result ? { ...entry.result, source: 'cache', savedAt: entry.savedAt, preview: true } : null;
}

/**
 * The saved copy most likely to match what will load. With no meal in the
 * address, today's menu opens on the meal for the time of day, so preview
 * that one; on another day it opens on the first meal, which is unknown here.
 */
export function peekLikelyMenu(hallSlug, date, mealSlug) {
  if (mealSlug) return peekCachedMenu(hallSlug, date, mealSlug);
  if (date !== campusDate()) return null;
  const guess = pickCurrentPeriod([{ slug: 'breakfast' }, { slug: 'lunch' }, { slug: 'dinner' }], campusNow().minutes);
  return guess ? peekCachedMenu(hallSlug, date, guess.slug) : null;
}

/**
 * Which warning, if any, a menu result needs: 'server' (our stored copy),
 * 'saved' (this device's copy after a failed load), or null. A preview drawn
 * while loading never warns: that was the "saved copy on every visit" bug.
 */
export function menuNotice(result) {
  if (!result || result.status !== 'ok' || result.preview) return null;
  if (result.source === 'server') return 'server';
  if (result.source === 'cache') return 'saved';
  return null;
}

function saveToCache(result) {
  if (result.status !== 'ok' || !result.period) return;
  writeJson(cacheKey(result.hall, result.date, result.period.slug), { savedAt: new Date().toISOString(), result });

  // Keep the cache bounded: drop the oldest entries beyond the limit.
  const keys = keysWithPrefix(CACHE_PREFIX);
  if (keys.length <= CACHE_LIMIT) return;
  keys
    .map(key => ({ key, savedAt: readJson(key)?.savedAt ?? '' }))
    .sort((a, b) => a.savedAt.localeCompare(b.savedAt))
    .slice(0, keys.length - CACHE_LIMIT)
    .forEach(({ key }) => removeKey(key));
}

/* Live --------------------------------------------------------------------- */

async function loadLive(hall, date, mealSlug, options) {
  const listing = await fetchPeriods(hall, date, options);
  const periods = normalizePeriods(listing.periods);

  if (periods.length === 0) {
    return { status: listing.closed ? 'closed' : 'no-menu', periods, period: null, stations: [] };
  }

  const period = mealSlug
    ? periods.find(p => p.slug === mealSlug) ?? null
    : (date === campusDate() ? pickCurrentPeriod(periods, campusNow().minutes) : periods[0]);

  if (!period) return { status: 'not-served', periods, period: null, stations: [] };

  // The listing already carries the default period's categories, so only the
  // other ids need a request of their own.
  const included = listing.menu?.periods;
  const groups = await Promise.all(period.ids.map(id => (
    included?.id === id
      ? normalizeStations(included)
      : fetchPeriod(hall, id, date, options).then(json => normalizeStations(json.menu?.periods))
  )));
  const stations = mergeStations(groups);

  return {
    status: stations.length ? 'ok' : 'no-menu',
    periods,
    period: { slug: period.slug, name: period.name },
    stations,
  };
}

/* Our API ------------------------------------------------------------------ */

/** Convert the /api/menu payload, which is a flat item list, into stations. */
export function fromServerPayload(json) {
  const byStation = new Map();
  for (const raw of Array.isArray(json?.items) ? json.items : []) {
    const station = raw.station || 'Menu';
    if (!byStation.has(station)) byStation.set(station, []);
    const vegan = Boolean(raw.isVegan);
    const protein = toNumber(raw.protein);
    byStation.get(station).push({
      id: String(raw.id ?? `${station}-${raw.name}`),
      name: String(raw.name ?? '').trim() || 'Unnamed item',
      station,
      portion: raw.portion ?? null,
      description: raw.description ?? null,
      ingredients: null,
      calories: toNumber(raw.calories),
      protein,
      carbs: toNumber(raw.carbs),
      fat: toNumber(raw.fat),
      saturatedFat: null,
      fiber: toNumber(raw.fiber),
      sugar: toNumber(raw.sugar),
      sodium: toNumber(raw.sodium),
      cholesterol: null,
      vegan,
      vegetarian: vegan || Boolean(raw.isVegetarian),
      glutenFree: false,
      highProtein: protein != null ? protein >= 15 : Boolean(raw.isHighProtein),
      labels: [],
      allergens: [],
    });
  }
  return [...byStation.entries()].map(([name, items]) => ({ name, items }));
}

async function loadFromServer(hall, mealSlug, options) {
  const json = await getJson(`/api/menu/${hall.slug}/${mealSlug}`, { ...options, retries: 0, timeoutMs: 8_000 });
  const stations = fromServerPayload(json);
  if (!stations.length) throw new Error('The stored menu is empty');
  return {
    status: 'ok',
    periods: [],
    period: { slug: mealSlug, name: json.period || mealSlug },
    stations,
    servedDate: json.date ?? null,
    ageDays: json.ageDays ?? null,
  };
}

/* Public ------------------------------------------------------------------- */

/**
 * Result shape:
 *   { status, source, hall, date, periods, period, stations, errors, ... }
 * status: 'ok' | 'not-served' | 'closed' | 'no-menu' | 'unavailable'
 * source: 'live' | 'server' | 'cache' | null
 */
export async function loadMenu({ hallSlug, date = campusDate(), mealSlug = null, signal } = {}) {
  const hall = hallBySlug(hallSlug);
  if (!hall) {
    return { status: 'unknown-hall', source: null, hall: hallSlug, date, periods: [], period: null, stations: [], errors: [] };
  }

  const options = { signal };
  const meal = mealSlug ? slugify(mealSlug) : null;
  const errors = [];

  try {
    const live = await loadLive(hall, date, meal, options);
    const result = { ...live, source: 'live', hall: hall.slug, date, errors, fetchedAt: new Date().toISOString() };
    saveToCache(result);
    return result;
  } catch (err) {
    if (signal?.aborted) throw err;
    errors.push({ source: 'live', message: err.message });
  }

  // The stored copy is only keyed by meal and only meaningful for today.
  const wanted = meal ?? pickCurrentPeriod(
    [{ slug: 'breakfast' }, { slug: 'lunch' }, { slug: 'dinner' }],
    campusNow().minutes
  ).slug;

  if (date === campusDate()) {
    try {
      const stored = await loadFromServer(hall, wanted, options);
      return { ...stored, source: 'server', hall: hall.slug, date, errors };
    } catch (err) {
      if (signal?.aborted) throw err;
      errors.push({ source: 'server', message: err.message });
    }
  }

  const cached = peekCachedMenu(hall.slug, date, wanted);
  if (cached) return { ...cached, preview: false, errors };

  return { status: 'unavailable', source: null, hall: hall.slug, date, periods: [], period: null, stations: [], errors };
}

/**
 * The same meal on the day before and the day after, for spotting dishes that
 * are new today. Uses this browser's saved copies first and never throws:
 * a day that cannot be loaded comes back as null.
 */
export async function loadNeighbourStations({ hallSlug, date, mealSlug, signal } = {}) {
  const hall = hallBySlug(hallSlug);
  const meal = mealSlug ? slugify(mealSlug) : null;
  if (!hall || !meal) return [];

  return Promise.all([addDays(date, -1), addDays(date, 1)].map(async day => {
    const cached = peekCachedMenu(hall.slug, day, meal);
    if (cached?.stations?.length) return cached.stations;
    try {
      const live = await loadLive(hall, day, meal, { signal, retries: 0, timeoutMs: 8_000 });
      if (live.status === 'ok') saveToCache({ ...live, source: 'live', hall: hall.slug, date: day, errors: [], fetchedAt: new Date().toISOString() });
      return live.status === 'ok' ? live.stations : null;
    } catch {
      return null;
    }
  }));
}
