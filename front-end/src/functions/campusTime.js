/**
 * Everything in this app is anchored to campus time.
 *
 * DineOnCampus publishes menus under an America/New_York date, and a vote or a
 * food log belongs to the day it happened on campus. Using the browser clock
 * meant that after 8pm Eastern, when UTC has already rolled over, rows were
 * written against tomorrow and then looked up under today.
 */
const CAMPUS_TIME_ZONE = 'America/New_York';

const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: CAMPUS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** The campus calendar and clock for an instant, read field by field. */
function campusParts(date) {
  const parts = partsFormatter.formatToParts(date);
  const get = type => parts.find(part => part.type === type)?.value ?? '';
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    weekday: get('weekday'),
    // Some engines render midnight as hour 24 even with h23.
    hour: Number(get('hour')) % 24,
    minute: Number(get('minute')),
  };
}

/**
 * Today's date on campus as YYYY-MM-DD.
 *
 * Built from formatToParts rather than toLocaleDateString('en-CA'), because
 * the en-CA short date has changed shape between ICU releases and every
 * stored row is keyed on this exact string.
 */
export function campusDate(date = new Date()) {
  const { year, month, day } = campusParts(date);
  return `${year}-${month}-${day}`;
}

/**
 * The campus date a given number of days from today, negative for the past.
 * Calendar arithmetic happens at UTC midnight so daylight saving cannot
 * shift a day forwards or backwards.
 */
export function campusDateOffset(days, date = new Date()) {
  return addDays(campusDate(date), days);
}

/** Add whole days to a YYYY-MM-DD string. */
export function addDays(isoDate, days) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().substring(0, 10);
}

/** Weekday index (0 is Sunday) of a YYYY-MM-DD string. */
export function weekdayOf(isoDate) {
  return new Date(`${isoDate}T12:00:00Z`).getUTCDay();
}

/** The current weekday index (0 is Sunday) and minutes past midnight on campus. */
export function campusNow(date = new Date()) {
  const { weekday, hour, minute } = campusParts(date);
  return {
    day: WEEKDAY_INDEX[weekday] ?? date.getDay(),
    minutes: hour * 60 + minute,
    date: campusDate(date),
  };
}

/** Format today on campus for display, e.g. "Thursday, September 11". */
export function formatCampusDate(options, date = new Date()) {
  return date.toLocaleDateString('en-US', { timeZone: CAMPUS_TIME_ZONE, ...options });
}

/** Format a YYYY-MM-DD string for display without any time zone drift. */
export function formatIsoDate(isoDate, options) {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', ...options });
}

/** "Today", "Tomorrow", "Yesterday" or a short weekday and date. */
export function relativeDayLabel(isoDate, today = campusDate()) {
  if (isoDate === today) return 'Today';
  if (isoDate === addDays(today, 1)) return 'Tomorrow';
  if (isoDate === addDays(today, -1)) return 'Yesterday';
  return formatIsoDate(isoDate, { weekday: 'short', month: 'short', day: 'numeric' });
}
