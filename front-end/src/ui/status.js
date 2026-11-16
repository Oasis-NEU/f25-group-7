import { formatTime, nextOpening, openState, toMinutes } from '../functions/hours';
import { formatIsoDate } from '../functions/campusTime';

/** Minutes before closing when a hall reads as "closing soon". */
const CLOSING_SOON = 30;

/** "7:00 AM" without the ":00" when on the hour: "7 AM". */
export function shortTime(hhmm) {
  return formatTime(hhmm).replace(':00 ', ' ');
}

/**
 * The status of a hall right now, worded for people.
 * tone: 'open' | 'soon' | 'closed'
 */
export function describeStatus(days, now) {
  const state = openState(days, now);
  if (state.open) {
    const closes = toMinutes(state.closesAt) % 1440 || 1440;
    const left = (closes - now.minutes + 1440) % 1440;
    return left <= CLOSING_SOON
      ? { tone: 'soon', label: 'Closing soon', detail: `Closes ${shortTime(state.closesAt)}` }
      : { tone: 'open', label: 'Open now', detail: `Until ${shortTime(state.closesAt)}` };
  }

  const next = nextOpening(days, now);
  if (!next) return { tone: 'closed', label: 'Closed', detail: 'No hours this week' };
  if (next.dayOffset === 0) return { tone: 'closed', label: 'Closed', detail: `Opens ${shortTime(next.opens)}` };
  if (next.dayOffset === 1) return { tone: 'closed', label: 'Closed', detail: `Opens tomorrow ${shortTime(next.opens)}` };
  const weekday = next.date ? formatIsoDate(next.date, { weekday: 'short' }) : 'later';
  return { tone: 'closed', label: 'Closed', detail: `Opens ${weekday} ${shortTime(next.opens)}` };
}

/** True when DineOnCampus is answering but lists no opening at all this week. */
export function noHoursListed(halls, source) {
  return source === 'live' && halls.every(h => h.days.every(d => d.closed));
}
