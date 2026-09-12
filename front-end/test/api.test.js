import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { setSupabaseClient, today } from '../lib/api.js';
import { invoke, setRows, stubClient } from './helpers/supabase-stub.js';
import hoursHandler from '../api/hours.js';
import menuHandler from '../api/menu/[hall]/[meal].js';

const DATE = today();

beforeEach(() => setSupabaseClient(stubClient));
afterEach(() => { setSupabaseClient(null); setRows({}); });

const menuFor = (hall, meal) => invoke(menuHandler, {
  url: `/api/menu/${hall}/${meal}`,
  query: { hall, meal },
});

function seedMenu({ date = DATE } = {}) {
  setRows({
    locations: [{ id: 'L1', name: 'The Eatery at Stetson East', date }],
    periods:   [{ id: 'P1', location_id: 'L1', name: 'Lunch', date }],
    stations:  [{ id: 'S1', period_id: 'P1', name: 'Cucina', date }],
    menu_items: [{
      id: 'M1', name: 'Rigatoni', date, calories: 420, portion: '1 cup',
      is_vegetarian: true, is_vegan: false, is_high_protein: false, station_id: 'S1',
      nutrients: [{ name: 'Protein', value: '14', uom: 'g' }, { name: 'Sodium', value: '480', uom: 'mg' }],
    }],
  });
}

/* /api/hours ------------------------------------------------------------- */

test('hours groups rows per hall and keeps split windows', async () => {
  setRows({ hall_hours: [
    { location_name: 'A', day_of_week: 1, slot_index: 0, opens_at: '08:00:00', closes_at: '10:00:00', closed: false, fetched_at: '2026-09-11T08:00:00Z' },
    { location_name: 'A', day_of_week: 1, slot_index: 1, opens_at: '16:00:00', closes_at: '20:00:00', closed: false, fetched_at: '2026-09-11T09:00:00Z' },
    { location_name: 'A', day_of_week: 5, slot_index: 0, opens_at: null, closes_at: null, closed: true, fetched_at: '2026-09-11T08:00:00Z' },
    { location_name: 'B', day_of_week: 2, slot_index: 0, opens_at: '07:00:00', closes_at: '22:00:00', closed: false, fetched_at: '2026-09-11T08:00:00Z' },
  ]});

  const res = await invoke(hoursHandler, { url: '/api/hours' });
  assert.equal(res.code, 200);
  assert.equal(res.body.source, 'live');
  assert.equal(res.body.halls.length, 2);

  const a = res.body.halls.find(h => h.locationName === 'A');
  assert.equal(a.days.find(d => d.day === 1).slots.length, 2);
  assert.equal(a.days.find(d => d.day === 5).closed, true);
  // Postgres time values are trimmed to HH:MM for the UI.
  assert.equal(a.days.find(d => d.day === 1).slots[0].opens, '08:00');
  // The most recent sync wins, so staleness reflects the freshest row.
  assert.equal(res.body.fetchedAt, '2026-09-11T09:00:00Z');
  assert.equal(typeof res.body.ageDays, 'number');
});

test('hours reports an empty payload when nothing is stored', async () => {
  setRows({ hall_hours: [] });
  const res = await invoke(hoursHandler, { url: '/api/hours' });
  assert.equal(res.code, 200);
  assert.equal(res.body.source, 'empty');
  assert.deepEqual(res.body.halls, []);
});

test('hours treats a missing table as empty, not as a server error', async () => {
  setRows({ __errors: { hall_hours: { code: '42P01', message: 'relation "hall_hours" does not exist' } } });
  const res = await invoke(hoursHandler, { url: '/api/hours' });
  assert.equal(res.code, 200);
  assert.equal(res.body.source, 'empty');
});

test('hours surfaces a genuine database error as 502 JSON', async () => {
  setRows({ __errors: { hall_hours: { code: '08006', message: 'connection failure' } } });
  const res = await invoke(hoursHandler, { url: '/api/hours' });
  assert.equal(res.code, 502);
  assert.match(res.body.message, /connection failure/);
});

test('a preflight request is answered without touching the database', async () => {
  const res = await invoke(hoursHandler, { method: 'OPTIONS', url: '/api/hours' });
  assert.equal(res.code, 204);
  assert.equal(res.ended, true);
  assert.equal(res.headers['Access-Control-Allow-Origin'], '*');
});

/* /api/menu/:hall/:meal -------------------------------------------------- */

test('a missing route parameter is rejected as 400, not a crash', async () => {
  const res = await invoke(menuHandler, { url: '/api/menu' });
  assert.equal(res.code, 400);
  assert.match(res.body.message, /Missing "hall"/);
});

test('today\'s menu is returned with nutrients and station names', async () => {
  seedMenu();
  const res = await menuFor('stetson-east', 'lunch');

  assert.equal(res.code, 200);
  assert.equal(res.body.totalItems, 1);
  assert.equal(res.body.ageDays, 0);

  const [item] = res.body.items;
  assert.equal(item.name, 'Rigatoni');
  assert.equal(item.station, 'Cucina');
  assert.equal(item.protein, '14 g');
  assert.equal(item.sodium, '480 mg');
  assert.equal(item.isVegetarian, true);
  assert.equal(item.isVegan, false);
});

test('hall and meal slugs are matched case-insensitively', async () => {
  seedMenu();
  const res = await invoke(menuHandler, {
    url: '/api/menu/X/Y',
    query: { hall: 'STETSON-EAST', meal: 'Lunch' },
  });
  assert.equal(res.code, 200);
});

test('an absent hall reports NO_MENU_DATA so the client can tell it apart', async () => {
  setRows({});
  const res = await menuFor('stetson-east', 'lunch');
  assert.equal(res.code, 404);
  assert.equal(res.body.code, 'NO_MENU_DATA');
  assert.match(res.body.hint, /run-scrape/);
});

test('a meal the hall does not serve reports PERIOD_NOT_SERVED', async () => {
  seedMenu();
  const res = await menuFor('stetson-east', 'breakfast');
  assert.equal(res.code, 404);
  assert.equal(res.body.code, 'PERIOD_NOT_SERVED');
});

test('yesterday\'s menu is served but labelled with its age', async () => {
  const yesterday = new Date(Date.parse(`${DATE}T00:00:00Z`) - 86_400_000)
    .toISOString().slice(0, 10);
  seedMenu({ date: yesterday });

  const res = await menuFor('stetson-east', 'lunch');
  assert.equal(res.code, 200);
  assert.equal(res.body.date, yesterday);
  assert.equal(res.body.ageDays, 1);
});

test('a menu older than the fallback window is withheld rather than shown as current', async () => {
  const longAgo = new Date(Date.parse(`${DATE}T00:00:00Z`) - 40 * 86_400_000)
    .toISOString().slice(0, 10);
  seedMenu({ date: longAgo });

  const res = await menuFor('stetson-east', 'lunch');
  assert.equal(res.code, 404);
  assert.equal(res.body.code, 'NO_MENU_DATA');
  assert.equal(res.body.ageDays, 40);
  assert.match(res.body.message, /40 days old/);
});
