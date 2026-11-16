/**
 * Menu curation against a full real menu: Stetson East lunch on 2026-10-18,
 * 154 items over 13 stations (test/fixtures/doc-lunch-steast-full.json).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { normalizeStations } from '../src/data/dineoncampus.js';
import { curateMenu, dishKey, flavorOf, isExtra, newTodayKeys, stablePicks, stationLabel } from '../src/data/curate.js';

const raw = JSON.parse(readFileSync(new URL('./fixtures/doc-lunch-steast-full.json', import.meta.url)));
const stations = normalizeStations(raw.menu.periods);
const byName = (list, name) => list.find(s => s.name === name);

test('condiments are extras and plated food is not', () => {
  const cucina = byName(stations, 'CUCINA');
  const extra = name => isExtra(cucina.items.find(i => i.name === name));
  assert.equal(extra('Crushed Red Pepper'), true);
  assert.equal(extra('Dried Oregano'), true);
  assert.equal(extra('Chicken Tikka Masala Pasta'), false);
  assert.equal(extra('Cheese Pizza'), false);
});

test('toppings and sugars are add-ons even when a cup of them is 800 calories', () => {
  assert.equal(isExtra({ name: 'Brown Sugar Topping', portion: '1 cup', calories: 800 }), true);
  assert.equal(isExtra({ name: 'Cinnamon Sugar', portion: '1 tbsp', calories: 110, description: 'cinnamon, sugar, brown sugar mix' }), true);
  assert.equal(isExtra({ name: 'Pancakes', portion: '2 each', calories: 170 }), false);
});

test('salad bars, the deli counter and the omelet station fold as build-your-own', () => {
  const { stations: curated } = curateMenu(stations);
  for (const name of ['FRESH 52 A', 'FRESH 52 B', 'DELI', 'MENUTAINMENT']) {
    assert.equal(byName(curated, name).kind, 'build', name);
  }
  // A deli special is one plated sandwich, not the deli counter.
  assert.equal(byName(curated, 'DELI SPECIAL').kind, 'dishes');
  assert.equal(byName(curated, 'SWEET SHOPPE').kind, 'sweets');
});

test('most of the item count is parts, so the dishes list is much shorter', () => {
  const { counts } = curateMenu(stations);
  assert.equal(counts.items, 154);
  assert.ok(counts.dishes < 60, `expected under 60 dishes, got ${counts.dishes}`);
});

test('picks lead with real dishes, at most one per station before any second', () => {
  const { picks } = curateMenu(stations);
  const names = picks.map(p => p.name);
  assert.ok(names.includes('Huli Huli Chicken'));
  assert.ok(names.includes('Chicken Tikka Masala Pasta'));
  assert.ok(picks.length <= 8);
  assert.ok(picks.every(p => !isExtra(p)));
  const firstStations = picks.slice(0, new Set(picks.map(p => p.station)).size).map(p => p.station);
  assert.equal(new Set(firstStations).size, firstStations.length);
});

test('new today is unknown without a comparison, and specific with one', () => {
  assert.equal(newTodayKeys(stations, []), null);
  assert.equal(newTodayKeys(stations, [null, null]), null);

  const yesterday = stations.map(s => ({ ...s, items: s.items.filter(i => i.name !== 'Huli Huli Chicken') }));
  const keys = newTodayKeys(stations, [yesterday]);
  assert.deepEqual([...keys], [dishKey('Huli Huli Chicken')]);

  const { stations: curated, picks } = curateMenu(stations, { newKeys: keys });
  assert.equal(byName(curated, 'HOMESTYLE').dishes.find(d => d.name === 'Huli Huli Chicken').isNew, true);
  assert.equal(picks[0].name, 'Huli Huli Chicken', 'a new dish leads the picks');
});

test('stations get a food family and a readable label', () => {
  assert.equal(flavorOf('CUCINA'), 'italian');
  assert.equal(flavorOf('FLAME'), 'grill');
  assert.equal(flavorOf('SWEET SHOPPE'), 'sweets');
  assert.equal(flavorOf('FRESH 52 A'), 'fresh');
  assert.equal(flavorOf('Something Unheard Of'), 'other');
  assert.equal(flavorOf('LATIN KITCHEN'), 'global');
  assert.equal(flavorOf('The Kitchen'), 'homestyle');
  assert.equal(stationLabel('DELICIOUS WITHOUT'), 'Delicious Without');
});

test('the new-today proof names only the days that were actually compared', async () => {
  const { newProof } = await import('../src/ui/menu/filters.js');
  assert.equal(newProof({ yesterday: true, tomorrow: true }, 'Lunch'), 'Not on yesterday’s or tomorrow’s lunch');
  assert.equal(newProof({ yesterday: false, tomorrow: true }, 'Dinner'), 'Not on tomorrow’s dinner');
  assert.equal(newProof({ yesterday: true, tomorrow: false }, 'Brunch'), 'Not on yesterday’s brunch');
  assert.equal(newProof(null, 'Lunch'), '');
});

test('picks keep their order when new-today flags arrive late', () => {
  const before = stablePicks(stations).map(p => p.name);
  const yesterday = stations.map(s => ({ ...s, items: s.items.filter(i => i.name !== before[before.length - 1]) }));
  const keys = newTodayKeys(stations, [yesterday]);
  const after = stablePicks(stations, keys);
  assert.deepEqual(after.map(p => p.name), before, 'same dishes in the same order');
  assert.equal(after[after.length - 1].isNew, true, 'the late flag is still applied');
});
