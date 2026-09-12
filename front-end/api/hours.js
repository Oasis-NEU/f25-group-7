/**
 * Opening hours for the residential dining halls.
 *
 * Reads the hall_hours table, which backend-folder/run-scrape.js fills from
 * DineOnCampus. Returns an empty payload rather than an error when the table
 * is missing or unpopulated, so the page can fall back to its bundled
 * schedule instead of showing a failure.
 */
import { ageInDays, getSupabase, withErrorHandling, HttpError } from '../lib/api.js';

/** Postgres returns time as HH:MM:SS. The UI only needs HH:MM. */
function toHourMinute(value) {
  if (typeof value !== 'string') return null;
  const match = value.match(/^(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : null;
}

/** True when the table has not been created yet, which is not a server fault. */
function isMissingTable(error) {
  if (!error) return false;
  return error.code === '42P01'
    || error.code === 'PGRST205'
    || /does not exist|could not find the table/i.test(error.message ?? '');
}

async function handler(req, res) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('hall_hours')
    .select('location_name, day_of_week, slot_index, opens_at, closes_at, closed, fetched_at')
    .order('location_name')
    .order('day_of_week')
    .order('slot_index');

  if (error && !isMissingTable(error)) {
    throw new HttpError(502, `Reading hall_hours: ${error.message}`);
  }

  const rows = error ? [] : (data ?? []);

  if (rows.length === 0) {
    res.status(200).json({ source: 'empty', fetchedAt: null, ageDays: null, halls: [] });
    return;
  }

  const byLocation = new Map();
  let newestFetch = null;

  for (const row of rows) {
    if (!byLocation.has(row.location_name)) {
      byLocation.set(row.location_name, new Map());
    }
    const days = byLocation.get(row.location_name);
    if (!days.has(row.day_of_week)) {
      days.set(row.day_of_week, { day: row.day_of_week, closed: true, slots: [] });
    }

    const day = days.get(row.day_of_week);
    const opens = toHourMinute(row.opens_at);
    const closes = toHourMinute(row.closes_at);

    if (!row.closed && opens && closes) {
      day.slots.push({ opens, closes });
      day.closed = false;
    }

    if (row.fetched_at && (!newestFetch || row.fetched_at > newestFetch)) {
      newestFetch = row.fetched_at;
    }
  }

  const halls = [...byLocation.entries()].map(([locationName, days]) => ({
    locationName,
    days: [...days.values()].sort((a, b) => a.day - b.day),
  }));

  res.status(200).json({
    source: 'live',
    fetchedAt: newestFetch,
    ageDays: ageInDays(newestFetch),
    halls,
  });
}

export default withErrorHandling(handler);
