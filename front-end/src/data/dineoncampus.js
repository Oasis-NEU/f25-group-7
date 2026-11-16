/**
 * Read menus and hours straight from DineOnCampus, in the visitor's browser.
 *
 * Why this is safe to rely on: DineOnCampus's v1 API answers with
 * `Access-Control-Allow-Origin: *`, and the Cloudflare rules that block cloud
 * servers (and therefore our scraper on Vercel or GitHub Actions) let real
 * browsers through. So the page no longer depends on anyone having run a
 * scraper recently. Verified against the live API on 2026-10-18.
 *
 * The newer apiv4 host does not send CORS headers, so it cannot be used here.
 */
import { getJson, FetchError } from './http.js';
import { HALLS, slugify } from './halls.js';
import { readJson, writeJson } from './storage.js';
import { mergeSlots } from '../functions/hours.js';
import { weekdayOf } from '../functions/campusTime.js';

export const API_BASE = 'https://api.dineoncampus.com/v1';
export const SITE_ID = '5751fd2b90975b60e048929a';
export const OFFICIAL_SITE = 'https://dineoncampus.com/northeastern';

/** DineOnCampus reports errors as HTTP 200 with status "error". */
function checkStatus(json, url) {
  if (json && json.status === 'error') {
    const error = new FetchError(json.msg || 'DineOnCampus reported an error', { kind: 'upstream', url });
    error.invalidLocation = /invalid location/i.test(json.msg ?? '');
    throw error;
  }
  if (!json || typeof json !== 'object') {
    throw new FetchError('DineOnCampus returned an empty response', { kind: 'parse', url });
  }
  return json;
}

async function get(path, options) {
  const url = `${API_BASE}${path}`;
  return checkStatus(await getJson(url, options), url);
}

/* Location ids ------------------------------------------------------------- */

const ID_OVERRIDES_KEY = 'location-ids';

/** The id to use for a hall: a remembered correction, else the bundled one. */
export function locationIdFor(hall) {
  return readJson(ID_OVERRIDES_KEY)?.[hall.slug] ?? hall.dineId;
}

/**
 * Find a hall in the site's location list by name and remember its id.
 * Returns the new id, or null when no location matches.
 */
async function rediscoverLocationId(hall, date, options) {
  const schedule = await fetchWeeklySchedule(date, options);
  const found = findHallLocation(schedule.the_locations, hall);
  if (!found?.id) return null;
  writeJson(ID_OVERRIDES_KEY, { ...(readJson(ID_OVERRIDES_KEY) ?? {}), [hall.slug]: found.id });
  return found.id;
}

/** Match a hall against DineOnCampus locations by id first, then by name. */
export function findHallLocation(locations, hall, id = hall.dineId) {
  const list = Array.isArray(locations) ? locations : [];
  return list.find(loc => loc.id === id || loc._id === id)
    ?? list.find(loc => loc.name === hall.locationName)
    ?? list.find(loc => hall.match.test(loc.name ?? ''))
    ?? null;
}

/** Run a per-location request, retrying once under a rediscovered id. */
async function withLocation(hall, date, options, request) {
  const current = locationIdFor(hall);
  try {
    return await request(current);
  } catch (err) {
    if (!err.invalidLocation) throw err;
    const replacement = await rediscoverLocationId(hall, date, options);
    if (!replacement || replacement === current) throw err;
    return request(replacement);
  }
}

/* Raw endpoints ------------------------------------------------------------ */

export function fetchWeeklySchedule(date, options) {
  return get(`/locations/weekly_schedule?site_id=${SITE_ID}&date=${date}`, options);
}

export function fetchPeriods(hall, date, options) {
  return withLocation(hall, date, options,
    id => get(`/location/${id}/periods?platform=0&date=${date}`, options));
}

export function fetchPeriod(hall, periodId, date, options) {
  return withLocation(hall, date, options,
    id => get(`/location/${id}/periods/${periodId}?platform=0&date=${date}`, options));
}

/* Normalising -------------------------------------------------------------- */

const NUTRIENTS = [
  ['calories', /^calories$/i],
  ['protein', /^protein/i],
  ['carbs', /carbohydrate/i],
  ['sugar', /sugar/i],
  ['fat', /^total fat/i],
  ['saturatedFat', /saturated/i],
  ['transFat', /trans fat/i],
  ['cholesterol', /cholesterol/i],
  ['fiber', /fiber/i],
  ['sodium', /sodium/i],
];

/** "12.5" -> 12.5, "less than 1 gram" -> 1, "-" -> null. */
export function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const match = String(value ?? '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

/**
 * One DineOnCampus menu item, flattened to what the UI needs.
 * Every field is optional upstream, so nothing here may assume a shape.
 */
export function normalizeItem(item, station) {
  const nutrients = {};
  for (const nutrient of Array.isArray(item?.nutrients) ? item.nutrients : []) {
    const entry = NUTRIENTS.find(([, pattern]) => pattern.test(nutrient?.name ?? ''));
    if (!entry || nutrients[entry[0]] != null) continue;
    nutrients[entry[0]] = toNumber(nutrient.value_numeric ?? nutrient.valueNumeric ?? nutrient.value);
  }

  const filters = (Array.isArray(item?.filters) ? item.filters : [])
    .map(filter => (typeof filter === 'string' ? { name: filter } : filter))
    .filter(filter => filter?.name);
  const labels = filters.filter(f => f.type !== 'allergen').map(f => f.name);
  const allergens = [...new Set(filters.filter(f => f.type === 'allergen').map(f => f.name.trim()))];

  const vegan = labels.includes('Vegan');
  const calories = toNumber(item?.calories) ?? nutrients.calories ?? null;

  return {
    id: String(item?.id ?? `${station}-${item?.name}`),
    name: String(item?.name ?? '').trim() || 'Unnamed item',
    station: station ?? null,
    order: Number.isFinite(Number(item?.sort_order)) ? Number(item.sort_order) : null,
    portion: item?.portion || null,
    description: item?.desc?.trim() || null,
    ingredients: item?.ingredients?.trim() || null,
    calories,
    protein: nutrients.protein ?? null,
    carbs: nutrients.carbs ?? null,
    fat: nutrients.fat ?? null,
    saturatedFat: nutrients.saturatedFat ?? null,
    fiber: nutrients.fiber ?? null,
    sugar: nutrients.sugar ?? null,
    sodium: nutrients.sodium ?? null,
    cholesterol: nutrients.cholesterol ?? null,
    vegan,
    vegetarian: vegan || labels.includes('Vegetarian'),
    glutenFree: labels.includes('Avoiding Gluten'),
    // DineOnCampus puts "Good Source of Protein" on dishes with 6 g, so the
    // grams decide whenever they are known; the label only fills a gap.
    highProtein: nutrients.protein != null ? nutrients.protein >= 15 : labels.includes('Good Source of Protein'),
    labels: labels.filter(l => !['Vegan', 'Vegetarian', 'Avoiding Gluten', 'Good Source of Protein'].includes(l)),
    allergens,
  };
}

/** Categories of one period, as stations with at least one item. */
export function normalizeStations(period) {
  const categories = Array.isArray(period?.categories) ? period.categories : [];
  return categories
    .map(category => ({
      name: String(category?.name ?? 'Other').trim(),
      items: (Array.isArray(category?.items) ? category.items : [])
        .map(item => normalizeItem(item, String(category?.name ?? 'Other').trim())),
    }))
    .filter(station => station.items.length > 0);
}

/** Merge stations from several period ids that share a name. */
export function mergeStations(groups) {
  const byName = new Map();
  for (const station of groups.flat()) {
    const existing = byName.get(station.name);
    if (!existing) {
      byName.set(station.name, { name: station.name, items: [...station.items] });
      continue;
    }
    const seen = new Set(existing.items.map(item => item.name));
    existing.items.push(...station.items.filter(item => !seen.has(item.name)));
  }
  return [...byName.values()];
}

/**
 * The meals a hall serves on a day, one entry per name.
 *
 * DineOnCampus sometimes lists a name twice with different ids (60 Belvidere
 * shows two "Dinner" periods), so ids are grouped. "Everyday" is a container
 * for always-on stations rather than a meal and is left out, as the original
 * scraper did.
 */
export function normalizePeriods(list) {
  const groups = new Map();
  const sorted = (Array.isArray(list) ? list : [])
    .filter(period => period?.id && period?.name && !/^every\s*day$/i.test(period.name))
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  for (const period of sorted) {
    const slug = slugify(period.name);
    if (!groups.has(slug)) groups.set(slug, { slug, name: period.name.trim(), ids: [] });
    groups.get(slug).ids.push(period.id);
  }

  // Upstream order is not always chronological (60 Belvidere lists Dinner,
  // Brunch, Dinner), so known meals are put in the order they are served.
  const rank = slug => {
    const index = MEAL_ORDER.findIndex(pattern => pattern.test(slug));
    return index === -1 ? MEAL_ORDER.length : index;
  };
  return [...groups.values()]
    .map((group, index) => ({ group, index }))
    .sort((a, b) => rank(a.group.slug) - rank(b.group.slug) || a.index - b.index)
    .map(({ group }) => group);
}

const MEAL_ORDER = [/breakfast/, /brunch/, /lunch/, /dinner/, /late/];

/** "8", "30" -> "08:30". Hours of 24 or more stay as written so they read as midnight. */
function hhmm(hour, minutes) {
  const h = Number(hour);
  const m = Number(minutes) || 0;
  if (!Number.isFinite(h)) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** One weekly_schedule day as { date, day, closed, special, slots }. */
export function normalizeScheduleDay(entry) {
  const windows = (Array.isArray(entry?.hours) ? entry.hours : [])
    .map(w => ({ opens: hhmm(w?.start_hour, w?.start_minutes), closes: hhmm(w?.end_hour, w?.end_minutes) }))
    .filter(w => w.opens && w.closes);
  const slots = mergeSlots(windows);
  const closed = entry?.closed === true || entry?.status === 'closed' || slots.length === 0;
  const date = typeof entry?.date === 'string' ? entry.date.slice(0, 10) : null;
  return {
    date,
    day: date ? weekdayOf(date) : Number(entry?.day) % 7,
    closed,
    special: entry?.has_special_hours === true,
    slots: closed ? [] : slots,
  };
}

/** Live hours for every hall, keyed by slug. Halls not found are omitted. */
export function normalizeSchedule(json) {
  const result = {};
  for (const hall of HALLS) {
    const location = findHallLocation(json?.the_locations, hall, locationIdFor(hall));
    const week = Array.isArray(location?.week) ? location.week : [];
    const days = week.map(normalizeScheduleDay).filter(day => day.date);
    if (days.length) result[hall.slug] = days;
  }
  return result;
}
