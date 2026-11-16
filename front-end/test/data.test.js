/**
 * The browser data layer: DineOnCampus parsing and the fallback chain.
 *
 * Fixtures in test/fixtures are trimmed copies of real DineOnCampus v1
 * responses captured on 2026-10-18.
 */
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { normalizeItem, normalizePeriods, normalizeSchedule } from '../src/data/dineoncampus.js';
import { loadMenu, menuNotice } from '../src/data/menu.js';
import { loadHours, projectWeek } from '../src/data/schedule.js';
import { getJson } from '../src/data/http.js';
import { HALLS, pickCurrentPeriod } from '../src/data/halls.js';
import { addDays, campusDate } from '../src/functions/campusTime.js';
import { formatTime, nextOpening, openState, toMinutes } from '../src/functions/hours.js';

const fixture = name => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url)));

const STEAST = HALLS[0];
const BELVIDERE = HALLS[2];
const FIXTURE_DATE = '2026-10-18';

/* A fake browser: in-memory localStorage and a routed fetch --------------- */

let routes;
let calls;
const realFetch = globalThis.fetch;

function memoryStorage() {
  const map = new Map();
  return {
    get length() { return map.size; },
    key: i => [...map.keys()][i] ?? null,
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k),
  };
}

const json = body => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
const html = (status = 403) => new Response('<!DOCTYPE html><title>Attention Required! | Cloudflare</title>', { status, headers: { 'content-type': 'text/html' } });

beforeEach(() => {
  globalThis.window = { localStorage: memoryStorage() };
  routes = [];
  calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    const route = routes.find(([pattern]) => pattern.test(String(url)));
    if (!route) throw new TypeError('Failed to fetch');
    return route[1](String(url));
  };
});

afterEach(() => {
  delete globalThis.window;
  globalThis.fetch = realFetch;
});

/* Parsing ------------------------------------------------------------------ */

test('periods drop the Everyday container and keep serving order', () => {
  assert.deepEqual(normalizePeriods(fixture('doc-periods-steast').periods).map(p => p.slug), ['breakfast', 'lunch', 'dinner']);
});

test('a meal listed twice is one period with both ids, in serving order', () => {
  const periods = normalizePeriods(fixture('doc-periods-belvidere').periods);
  assert.deepEqual(periods.map(p => p.slug), ['brunch', 'dinner']);
  assert.equal(periods.find(p => p.slug === 'dinner').ids.length, 2);
});

test('a real menu item flattens to numbers, labels and allergens', () => {
  const raw = fixture('doc-periods-steast').menu.periods.categories[0].items[0];
  const item = normalizeItem(raw, 'CUCINA');
  assert.equal(item.name, 'Vegetarian Baked Beans');
  assert.equal(item.station, 'CUCINA');
  assert.equal(item.calories, 210);
  assert.equal(item.protein, 7);
  assert.equal(item.carbs, 42);
  assert.equal(item.vegetarian, true);
  assert.equal(item.vegan, false);
  assert.equal(item.glutenFree, true);
  assert.ok(item.allergens.includes('Mustard'));
});

test('an item with nothing but a name still normalizes', () => {
  const item = normalizeItem({ name: 'Mystery' }, null);
  assert.equal(item.name, 'Mystery');
  assert.equal(item.calories, null);
  assert.deepEqual(item.allergens, []);
});

test('the weekly schedule yields dated hours for all three halls', () => {
  const schedule = normalizeSchedule(fixture('doc-weekly-schedule'));
  assert.deepEqual(Object.keys(schedule).sort(), HALLS.map(h => h.slug).sort());
  const belvidere = schedule[BELVIDERE.slug];
  assert.equal(belvidere[0].date, FIXTURE_DATE);
  assert.equal(belvidere[0].slots.length, 2);
  assert.equal(belvidere.find(d => d.day === 5).closed, true);
});

/* Menu loading ------------------------------------------------------------- */

const periodsRoute = [/\/v1\/location\/[^/]+\/periods\?/, () => json(fixture('doc-periods-steast'))];
const lunchRoute = [/\/v1\/location\/[^/]+\/periods\/[^?]+\?/, () => json(fixture('doc-period-lunch-steast'))];

test('the default period is served from the listing without a second request', async () => {
  routes = [periodsRoute];
  const result = await loadMenu({ hallSlug: 'stetson-east', date: FIXTURE_DATE, mealSlug: 'breakfast' });
  assert.equal(result.status, 'ok');
  assert.equal(result.source, 'live');
  assert.equal(result.period.slug, 'breakfast');
  assert.ok(result.stations.length > 0);
  assert.equal(calls.length, 1);
});

test('another meal is fetched from its own period endpoint', async () => {
  routes = [lunchRoute, periodsRoute];
  const result = await loadMenu({ hallSlug: 'steast', date: FIXTURE_DATE, mealSlug: 'lunch' });
  assert.equal(result.status, 'ok');
  assert.equal(result.period.name, 'Lunch');
  assert.equal(calls.length, 2);
});

test('a meal the hall does not serve that day says so and lists what it does serve', async () => {
  routes = [periodsRoute];
  const result = await loadMenu({ hallSlug: 'stetson-east', date: FIXTURE_DATE, mealSlug: 'brunch' });
  assert.equal(result.status, 'not-served');
  assert.deepEqual(result.periods.map(p => p.slug), ['breakfast', 'lunch', 'dinner']);
});

test('a day with nothing posted yet reports no-menu, not an error', async () => {
  routes = [[/periods\?/, () => json(fixture('doc-periods-empty'))]];
  const result = await loadMenu({ hallSlug: 'stetson-east', date: '2028-10-18', mealSlug: 'lunch' });
  assert.equal(result.status, 'no-menu');
  assert.equal(result.source, 'live');
});

test('a stale location id is rediscovered by name and remembered', async () => {
  const schedule = fixture('doc-weekly-schedule');
  schedule.the_locations.find(l => l.name === STEAST.locationName).id = 'NEW-STEAST-ID';
  routes = [
    [/location\/NEW-STEAST-ID\/periods\?/, () => json(fixture('doc-periods-steast'))],
    [new RegExp(`location/${STEAST.dineId}/`), () => json(fixture('doc-invalid-location'))],
    [/weekly_schedule/, () => json(schedule)],
  ];
  const result = await loadMenu({ hallSlug: 'stetson-east', date: FIXTURE_DATE, mealSlug: 'breakfast' });
  assert.equal(result.status, 'ok');

  calls = [];
  await loadMenu({ hallSlug: 'stetson-east', date: FIXTURE_DATE, mealSlug: 'breakfast' });
  assert.ok(calls[0].includes('NEW-STEAST-ID'), 'the corrected id is used straight away next time');
});

test('a Cloudflare block falls back to the stored menu from our API', async () => {
  const today = campusDate();
  routes = [
    [/dineoncampus/, () => html()],
    [/^\/api\/menu\/stetson-east\/lunch$/, () => json({
      date: today, ageDays: 0, period: 'Lunch',
      items: [{ id: 'm1', name: 'Rigatoni', station: 'Cucina', calories: 420, protein: '14 g', isVegetarian: true }],
    })],
  ];
  const result = await loadMenu({ hallSlug: 'stetson-east', date: today, mealSlug: 'lunch' });
  assert.equal(result.status, 'ok');
  assert.equal(result.source, 'server');
  assert.equal(result.stations[0].items[0].protein, 14);
  assert.equal(result.errors[0].source, 'live');
});

test('with both sources down, the last copy this browser saw is shown and labelled', async () => {
  routes = [periodsRoute];
  await loadMenu({ hallSlug: 'stetson-east', date: FIXTURE_DATE, mealSlug: 'breakfast' });

  routes = [];
  const result = await loadMenu({ hallSlug: 'stetson-east', date: FIXTURE_DATE, mealSlug: 'breakfast' });
  assert.equal(result.status, 'ok');
  assert.equal(result.source, 'cache');
  assert.ok(result.savedAt);
});

test('an instant preview from this device never warns; a real fallback does', async () => {
  routes = [periodsRoute];
  await loadMenu({ hallSlug: 'stetson-east', date: FIXTURE_DATE, mealSlug: 'breakfast' });
  const { peekCachedMenu } = await import('../src/data/menu.js');
  const preview = peekCachedMenu('stetson-east', FIXTURE_DATE, 'breakfast');
  assert.equal(menuNotice(preview), null, 'the preview drawn while loading is not a failure');

  routes = [];
  const fallback = await loadMenu({ hallSlug: 'stetson-east', date: FIXTURE_DATE, mealSlug: 'breakfast' });
  assert.equal(fallback.source, 'cache');
  assert.equal(menuNotice(fallback), 'saved', 'a copy served because loading failed is labelled');

  routes = [periodsRoute];
  const live = await loadMenu({ hallSlug: 'stetson-east', date: FIXTURE_DATE, mealSlug: 'breakfast' });
  assert.equal(menuNotice(live), null);
});

test('when every source fails the result is unavailable, never a throw', async () => {
  routes = [];
  const result = await loadMenu({ hallSlug: 'stetson-east', date: campusDate(), mealSlug: 'dinner' });
  assert.equal(result.status, 'unavailable');
  assert.ok(result.errors.length >= 2);
});

test('an unknown hall is reported without any network traffic', async () => {
  const result = await loadMenu({ hallSlug: 'nowhere', mealSlug: 'lunch' });
  assert.equal(result.status, 'unknown-hall');
  assert.equal(calls.length, 0);
});

test('a request that never answers times out instead of hanging', async () => {
  globalThis.fetch = (url, { signal }) => new Promise((_, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
  });
  await assert.rejects(getJson('https://example.test/x', { timeoutMs: 30, retries: 0 }), err => err.kind === 'timeout');
});

/* Hours loading ------------------------------------------------------------ */

test('live hours give every hall seven days starting today', async () => {
  routes = [[/weekly_schedule/, () => json(fixture('doc-weekly-schedule'))]];
  const result = await loadHours();
  assert.equal(result.source, 'live');
  for (const hall of result.halls) {
    assert.equal(hall.days.length, 7);
    assert.equal(hall.days[0].date, campusDate());
  }
});

test('days past Saturday come from the following week, not from a guess', async () => {
  const today = campusDate();
  // Two schedules whose dates cover today through today + 13.
  const weekFrom = start => {
    const schedule = fixture('doc-weekly-schedule');
    for (const loc of schedule.the_locations) {
      loc.week = Array.from({ length: 7 }, (_, i) => ({
        date: addDays(start, i), status: 'open', closed: false,
        hours: [{ start_hour: 9, start_minutes: 0, end_hour: 17, end_minutes: 0 }],
      }));
    }
    return schedule;
  };
  routes = [[/weekly_schedule/, url => json(url.includes(`date=${today}`) ? weekFrom(addDays(today, -3)) : weekFrom(addDays(today, 4)))]];
  const result = await loadHours();
  assert.equal(result.source, 'live');
  assert.ok(result.halls.every(h => h.days.every(d => !d.estimated)), 'no day is estimated');
});

test('with every source down, the bundled schedule still fills the week', async () => {
  routes = [];
  const result = await loadHours();
  assert.equal(result.source, 'bundled');
  for (const hall of result.halls) {
    assert.equal(hall.days.length, 7);
    assert.ok(hall.days.every(d => d.estimated));
  }
});

test('a saved week from months ago is projected by weekday and marked as estimated', () => {
  const old = normalizeSchedule(fixture('doc-weekly-schedule'))[BELVIDERE.slug];
  const week = projectWeek({ dated: old }, '2028-10-18');
  assert.equal(week.length, 7);
  assert.ok(week.every(d => d.estimated));
  assert.equal(week.find(d => d.day === 5).closed, true);
  assert.equal(week.find(d => d.day === 1).slots.length, 2);
});

/* Time handling ------------------------------------------------------------ */

test('the campus date is Eastern, even late in the evening', () => {
  assert.equal(campusDate(new Date('2026-10-19T03:30:00Z')), '2026-10-18');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
});

test('a close at 24:00 reads as midnight, not noon', () => {
  assert.equal(formatTime('24:00'), '12:00 AM');
});

test('a window past midnight stays open into the next morning', () => {
  const days = [
    { day: 5, closed: false, slots: [{ opens: '20:00', closes: '02:00' }] },
    { day: 6, closed: true, slots: [] },
  ];
  assert.equal(openState(days, { day: 5, minutes: toMinutes('23:30') }).open, true);
  assert.equal(openState(days, { day: 6, minutes: toMinutes('01:00') }).open, true);
  assert.equal(openState(days, { day: 6, minutes: toMinutes('03:00') }).open, false);
});

test('the next opening looks past closed days', () => {
  const days = [
    { date: 'a', closed: false, slots: [{ opens: '08:00', closes: '10:00' }] },
    { date: 'b', closed: true, slots: [] },
    { date: 'c', closed: false, slots: [{ opens: '09:00', closes: '12:00' }] },
  ];
  assert.deepEqual(nextOpening(days, { minutes: toMinutes('11:00') }), { dayOffset: 2, opens: '09:00', date: 'c' });
  assert.deepEqual(nextOpening(days, { minutes: toMinutes('07:00') }), { dayOffset: 0, opens: '08:00', date: 'a' });
});

test('the current period follows the time of day and what the hall serves', () => {
  const weekday = [{ slug: 'breakfast' }, { slug: 'lunch' }, { slug: 'dinner' }];
  const weekend = [{ slug: 'brunch' }, { slug: 'dinner' }];
  assert.equal(pickCurrentPeriod(weekday, toMinutes('08:00')).slug, 'breakfast');
  assert.equal(pickCurrentPeriod(weekday, toMinutes('12:00')).slug, 'lunch');
  assert.equal(pickCurrentPeriod(weekday, toMinutes('19:00')).slug, 'dinner');
  assert.equal(pickCurrentPeriod(weekend, toMinutes('09:00')).slug, 'brunch');
  assert.equal(pickCurrentPeriod(weekend, toMinutes('23:30')).slug, 'dinner');
});
