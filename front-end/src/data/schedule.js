/**
 * Opening hours for the next seven days, from the best source available.
 *
 *   1. DineOnCampus weekly_schedule, live from the browser. Dated, and it
 *      flags holidays and other special hours.
 *   2. Our /api/hours, a weekly template stored by the scraper.
 *   3. The last live copy this browser saw.
 *   4. The schedule bundled with the app (functions/hours.js).
 *
 * Each hall resolves independently, so one hall missing upstream does not
 * blank the others. Days projected from a weekly template rather than read
 * for that exact date are marked `estimated`, and the page says so.
 */
import { fetchWeeklySchedule, normalizeSchedule } from './dineoncampus.js';
import { getJson } from './http.js';
import { HALLS } from './halls.js';
import { readJson, writeJson } from './storage.js';
import { FALLBACK_UPDATED, HALLS as BUNDLED, mergeSlots } from '../functions/hours.js';
import { addDays, campusDate, weekdayOf } from '../functions/campusTime.js';

const CACHE_KEY = 'hours';

/** Seven dates starting today. */
function nextSevenDates(today) {
  return Array.from({ length: 7 }, (_, i) => addDays(today, i));
}

/**
 * Fill the next seven days from whatever is known.
 * `dated` entries win for their exact date; `template` covers the rest by weekday.
 */
export function projectWeek({ dated = [], template = [] }, today = campusDate()) {
  const byDate = new Map(dated.filter(d => d?.date).map(d => [d.date, d]));
  const byWeekday = new Map();
  for (const entry of [...template, ...dated]) {
    if (entry && Number.isInteger(entry.day) && !byWeekday.has(entry.day)) byWeekday.set(entry.day, entry);
  }

  return nextSevenDates(today).map(date => {
    const exact = byDate.get(date);
    if (exact) return { ...exact, estimated: false };
    const day = weekdayOf(date);
    const pattern = byWeekday.get(day);
    const slots = pattern && !pattern.closed ? mergeSlots(pattern.slots) : [];
    return { date, day, closed: slots.length === 0, special: false, slots, estimated: true };
  });
}

/**
 * weekly_schedule returns the Sunday-to-Saturday week containing the date,
 * so after Sunday the next seven days span two of its weeks. The second
 * request is best effort: if it fails, those days fall back to the pattern.
 */
async function fetchNextSevenDays(today, options) {
  const [thisWeek, nextWeek] = await Promise.all([
    fetchWeeklySchedule(today, options),
    fetchWeeklySchedule(addDays(today, 7), options).catch(err => {
      if (options.signal?.aborted) throw err;
      return null;
    }),
  ]);
  const first = normalizeSchedule(thisWeek);
  const second = nextWeek ? normalizeSchedule(nextWeek) : {};
  const merged = {};
  for (const [slug, days] of Object.entries(first)) {
    const seen = new Set(days.map(d => d.date));
    merged[slug] = [...days, ...(second[slug] ?? []).filter(d => !seen.has(d.date))];
  }
  return merged;
}

/** True when every day of a projected week is a guess. */
const allEstimated = week => week.every(day => day.estimated);

async function loadServerTemplates(options) {
  const json = await getJson('/api/hours', { ...options, retries: 0, timeoutMs: 8_000 });
  const templates = {};
  for (const hall of HALLS) {
    const match = (json?.halls ?? []).find(h => h.locationName === hall.locationName);
    if (match?.days?.length) templates[hall.slug] = match.days;
  }
  return { templates, fetchedAt: json?.fetchedAt ?? null };
}

/**
 * Result: { halls: [{ ...hall, days, source, fetchedAt }], source, errors }
 * source per hall: 'live' | 'server' | 'cache' | 'bundled'
 * The top-level source is the weakest one any hall had to use.
 */
export async function loadHours({ signal } = {}) {
  const today = campusDate();
  const options = { signal };
  const errors = [];

  let live = {};
  try {
    live = await fetchNextSevenDays(today, options);
    if (Object.keys(live).length) {
      writeJson(CACHE_KEY, { savedAt: new Date().toISOString(), halls: live });
    } else {
      errors.push({ source: 'live', message: 'No residential halls in the schedule' });
    }
  } catch (err) {
    if (signal?.aborted) throw err;
    errors.push({ source: 'live', message: err.message });
  }

  const needsFallback = HALLS.some(hall => !live[hall.slug]);
  let server = { templates: {}, fetchedAt: null };
  if (needsFallback) {
    try {
      server = await loadServerTemplates(options);
    } catch (err) {
      if (signal?.aborted) throw err;
      errors.push({ source: 'server', message: err.message });
    }
  }
  const cached = needsFallback ? readJson(CACHE_KEY) : null;

  const halls = HALLS.map(hall => {
    if (live[hall.slug]) {
      return { ...hall, days: projectWeek({ dated: live[hall.slug] }, today), source: 'live', fetchedAt: new Date().toISOString() };
    }

    if (server.templates[hall.slug]) {
      return { ...hall, days: projectWeek({ template: server.templates[hall.slug] }, today), source: 'server', fetchedAt: server.fetchedAt };
    }

    const cachedDays = cached?.halls?.[hall.slug];
    if (cachedDays?.length) {
      const days = projectWeek({ dated: cachedDays }, today);
      return { ...hall, days, source: 'cache', fetchedAt: cached.savedAt, estimated: allEstimated(days) };
    }

    const bundled = BUNDLED.find(b => b.locationName === hall.locationName);
    return {
      ...hall,
      days: projectWeek({ template: bundled?.days ?? [] }, today),
      source: 'bundled',
      fetchedAt: `${FALLBACK_UPDATED}T12:00:00Z`,
    };
  });

  const rank = { live: 0, cache: 1, server: 2, bundled: 3 };
  const source = halls.reduce((worst, h) => (rank[h.source] > rank[worst] ? h.source : worst), 'live');
  return { halls, source, errors };
}

/** The bundled schedule, shaped like a loadHours result, for the first paint. */
export function initialHours() {
  const today = campusDate();
  const cached = readJson(CACHE_KEY);
  const halls = HALLS.map(hall => {
    const cachedDays = cached?.halls?.[hall.slug];
    if (cachedDays?.length) {
      return { ...hall, days: projectWeek({ dated: cachedDays }, today), source: 'cache', fetchedAt: cached.savedAt };
    }
    const bundled = BUNDLED.find(b => b.locationName === hall.locationName);
    return { ...hall, days: projectWeek({ template: bundled?.days ?? [] }, today), source: 'bundled', fetchedAt: `${FALLBACK_UPDATED}T12:00:00Z` };
  });
  return { halls, source: 'pending', errors: [] };
}
