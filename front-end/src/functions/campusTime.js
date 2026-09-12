/**
 * Everything in this app is anchored to campus time.
 *
 * The scraper stores menus under an America/New_York date, and a vote or a
 * food log belongs to the day it happened on campus. Using the browser clock
 * meant that after 8pm Eastern, when UTC has already rolled over, rows were
 * written against tomorrow and then looked up under today.
 */
const CAMPUS_TIME_ZONE = 'America/New_York';

const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Today's date on campus as YYYY-MM-DD. */
export function campusDate(date = new Date()) {
  return date.toLocaleDateString('en-CA', { timeZone: CAMPUS_TIME_ZONE });
}

/**
 * The campus date a given number of days from today, negative for the past.
 * Calendar arithmetic happens at UTC midnight so daylight saving cannot
 * shift a day forwards or backwards.
 */
export function campusDateOffset(days, date = new Date()) {
  const [year, month, day] = campusDate(date).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().substring(0, 10);
}

/** The current weekday index (0 is Sunday) and minutes past midnight on campus. */
export function campusNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CAMPUS_TIME_ZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = type => parts.find(part => part.type === type)?.value ?? '';
  // Some engines render midnight as hour 24 under hour12: false.
  const hour = Number(get('hour')) % 24;

  return {
    day: WEEKDAY_INDEX[get('weekday')] ?? date.getDay(),
    minutes: hour * 60 + Number(get('minute')),
  };
}

/** Format today on campus for display, e.g. "Thursday, September 11". */
export function formatCampusDate(options, date = new Date()) {
  return date.toLocaleDateString('en-US', { timeZone: CAMPUS_TIME_ZONE, ...options });
}
