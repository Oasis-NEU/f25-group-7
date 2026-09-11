/**
 * Dining hall opening hours: the bundled fallback schedule plus the helpers
 * used to render either it or the live payload from /api/hours.
 *
 * Day indices match Date.getDay(), so 0 is Sunday.
 */
import { campusNow } from './campusTime.js';

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Weeks read better starting on Monday. */
export const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Expand a sparse day map into all seven days; omitted days count as closed. */
function week(byDay) {
  return [0, 1, 2, 3, 4, 5, 6].map(day => {
    const slots = byDay[day] ?? [];
    return {
      day,
      closed: slots.length === 0,
      slots: slots.map(([opens, closes]) => ({ opens, closes })),
    };
  });
}

/**
 * Shown when /api/hours has no rows, which is the case until the scraper has
 * run at least once. Last checked against DineOnCampus on 2026-04-12, so treat
 * it as approximate and re-verify each semester.
 */
export const FALLBACK_UPDATED = '2026-04-12';

export const HALLS = [
  {
    name: 'Stetson East',
    locationName: 'The Eatery at Stetson East',
    description:
      'The largest residential hall on campus, open all day every day with the widest choice of stations.',
    days: week({
      0: [['08:00', '22:00']],
      1: [['07:00', '22:00']],
      2: [['07:00', '22:00']],
      3: [['07:00', '22:00']],
      4: [['07:00', '22:00']],
      5: [['07:00', '21:00']],
      6: [['08:00', '21:00']],
    }),
  },
  {
    name: 'International Village',
    locationName: 'United Table at International Village',
    description:
      'Global cuisines on a rotating menu: Latin Kitchen, Spice Bowl, Sushi, Pomodoro and more. Open every day.',
    days: week({
      0: [['08:00', '21:00']],
      1: [['08:00', '22:00']],
      2: [['08:00', '22:00']],
      3: [['08:00', '22:00']],
      4: [['08:00', '22:00']],
      5: [['08:00', '21:00']],
      6: [['08:00', '21:00']],
    }),
  },
  {
    name: '60 Belvidere',
    locationName: 'Campus Roots at 60 Belvidere',
    description:
      'A smaller hall near Symphony Hall. Breakfast and dinner only, with no lunch service, and closed on weekends.',
    note: 'No lunch service',
    days: week({
      0: [['10:00', '14:00'], ['16:00', '20:00']],
      1: [['08:00', '10:00'], ['16:00', '20:00']],
      2: [['08:00', '10:00'], ['16:00', '20:00']],
      3: [['08:00', '10:00'], ['16:00', '20:00']],
      4: [['08:00', '10:00'], ['16:00', '20:00']],
    }),
  },
];

/** Minutes past midnight for an "HH:MM" string. */
export function toMinutes(hhmm) {
  const [hour, minute] = String(hhmm).split(':').map(Number);
  return hour * 60 + minute;
}

/** "17:30" becomes "5:30 PM". */
export function formatTime(hhmm) {
  const [hour, minute] = String(hhmm).split(':').map(Number);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

export function formatSlot(slot) {
  return `${formatTime(slot.opens)} to ${formatTime(slot.closes)}`;
}

/** Collapse consecutive days that share a schedule into "Mon to Thu" rows. */
export function groupWeek(days) {
  const byDay = new Map((days ?? []).map(entry => [entry.day, entry]));
  const groups = [];

  for (const day of DISPLAY_ORDER) {
    const entry = byDay.get(day) ?? { day, closed: true, slots: [] };
    const slots = entry.closed ? [] : (entry.slots ?? []);
    const signature = slots.length === 0
      ? 'closed'
      : slots.map(slot => `${slot.opens}-${slot.closes}`).join(',');

    const previous = groups[groups.length - 1];
    if (previous && previous.signature === signature) {
      previous.end = day;
    } else {
      groups.push({ signature, start: day, end: day, slots });
    }
  }

  return groups.map(group => ({
    label: group.start === group.end
      ? DAY_LABELS[group.start]
      : `${DAY_LABELS[group.start]} to ${DAY_LABELS[group.end]}`,
    closed: group.signature === 'closed',
    slots: group.slots,
  }));
}

/** Whether a hall is serving right now, and when that changes. */
export function openState(days, now = campusNow()) {
  const todayEntry = (days ?? []).find(entry => entry.day === now.day);
  const slots = todayEntry && !todayEntry.closed ? (todayEntry.slots ?? []) : [];

  for (const slot of slots) {
    if (now.minutes >= toMinutes(slot.opens) && now.minutes < toMinutes(slot.closes)) {
      return { open: true, closesAt: slot.closes };
    }
  }

  const upcoming = slots.find(slot => toMinutes(slot.opens) > now.minutes);
  return { open: false, opensAt: upcoming ? upcoming.opens : null };
}

/**
 * Merge the live payload over the bundled schedule.
 *
 * Halls the API does not know about keep their fallback hours, so a partial
 * scrape degrades one card at a time instead of emptying the page.
 */
export function mergeHours(liveHalls) {
  const live = new Map((liveHalls ?? []).map(hall => [hall.locationName, hall]));
  return HALLS.map(hall => {
    const match = live.get(hall.locationName);
    return match?.days?.length
      ? { ...hall, days: match.days, live: true }
      : { ...hall, live: false };
  });
}
