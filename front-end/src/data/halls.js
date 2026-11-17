/**
 * The three residential dining halls, in one place.
 *
 * `dineId` is the DineOnCampus location id as of 2026-10. Ids have changed
 * before (60 Belvidere's is from 2025), so `match` lets the client find a
 * hall again by name in the live location list if its id stops resolving.
 */
export const HALLS = [
  {
    slug: 'stetson-east',
    name: 'Stetson East',
    shortName: 'Steast',
    locationName: 'The Eatery at Stetson East',
    dineId: '586d05e4ee596f6e6c04b527',
    match: /stetson\s*east/i,
    mapQuery: '7 Speare Pl, Boston, MA 02115',
    aliases: ['steast'],
    description: 'The largest hall on campus, open all day with the widest choice of stations.',
  },
  {
    slug: 'international-village',
    name: 'International Village',
    shortName: 'IV',
    locationName: 'United Table at International Village',
    dineId: '5f4f8a425e42ad17329be131',
    match: /international\s*village/i,
    mapQuery: 'International Village, Northeastern University, Boston, MA',
    aliases: ['iv'],
    description: 'Global cuisines on a rotating menu: Latin Kitchen, Spice Bowl, sushi and more.',
  },
  {
    slug: '60-belvidere',
    name: '60 Belvidere',
    shortName: 'Belvidere',
    locationName: 'Campus Roots at 60 Belvidere',
    dineId: '686d10a81fea2d6aaeb9f733',
    match: /belvidere/i,
    mapQuery: '60 Belvidere St, Boston, MA',
    aliases: ['belvidere'],
    description: 'A smaller, quieter hall near Symphony Hall with a shorter daily schedule.',
  },
];

/** Look a hall up by its slug or one of its aliases. */
/**
 * Directions to a hall in the visitor's maps app: Apple Maps on Apple
 * devices, Google Maps everywhere else. No travel mode is forced, so walking,
 * transit (the T and buses) and driving are all one tap away in the app.
 * Searches by the building's name rather than a street number, so nothing
 * here can be a wrong address.
 */
export function directionsUrl(hall, ua = typeof navigator !== 'undefined' ? navigator.userAgent : '') {
  const q = encodeURIComponent(hall.mapQuery ?? `${hall.name}, Northeastern University, Boston, MA`);
  return /iPhone|iPad|iPod|Macintosh/.test(ua)
    ? `https://maps.apple.com/?daddr=${q}`
    : `https://www.google.com/maps/dir/?api=1&destination=${q}`;
}

export function hallBySlug(slug) {
  const key = String(slug ?? '').trim().toLowerCase();
  return HALLS.find(hall => hall.slug === key || hall.aliases.includes(key)) ?? null;
}

/** "Late Night Grill" becomes "late-night-grill". */
export function slugify(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Typical meal windows, used only to guess which menu to open first and to
 * order votes. Real opening hours come from DineOnCampus.
 */
export const MEAL_WINDOWS = [
  { slug: 'breakfast', label: 'Breakfast', start: 0,       end: 10 * 60 + 30 },
  { slug: 'brunch',    label: 'Brunch',    start: 0,       end: 15 * 60 },
  { slug: 'lunch',     label: 'Lunch',     start: 10 * 60 + 30, end: 16 * 60 },
  { slug: 'dinner',    label: 'Dinner',    start: 16 * 60, end: 24 * 60 },
];

/**
 * Choose the period that best fits the time of day.
 *
 * `periods` is the list a hall actually serves, so a weekend brunch wins over
 * a breakfast it does not offer. Falls back to the first period listed.
 */
export function pickCurrentPeriod(periods, minutes) {
  if (!periods?.length) return null;
  for (const window of MEAL_WINDOWS) {
    if (minutes < window.start || minutes >= window.end) continue;
    const match = periods.find(period => period.slug === window.slug);
    if (match) return match;
  }
  // After dinner, or a hall with unusual period names: prefer the last
  // service of the day in the evening and the first one otherwise.
  return minutes >= 16 * 60 ? periods[periods.length - 1] : periods[0];
}
