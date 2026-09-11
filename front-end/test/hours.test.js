import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  formatSlot, formatTime, groupWeek, mergeHours, openState, toMinutes,
} from '../src/functions/hours.js';

const hall = name => mergeHours([]).find(h => h.name === name);
const at = (day, time) => ({ day, minutes: toMinutes(time) });

test('consecutive days with the same schedule collapse into one row', () => {
  assert.deepEqual(
    groupWeek(hall('Stetson East').days).map(r => r.label),
    ['Mon to Thu', 'Fri', 'Sat', 'Sun'],
  );
});

test('a hall closed at the weekend reports those days as closed', () => {
  assert.deepEqual(
    groupWeek(hall('60 Belvidere').days).map(r => `${r.label}:${r.closed}`),
    ['Mon to Thu:false', 'Fri to Sat:true', 'Sun:false'],
  );
});

test('a split schedule keeps both service windows', () => {
  const monThu = groupWeek(hall('60 Belvidere').days)[0];
  assert.equal(monThu.slots.length, 2);
  assert.deepEqual(monThu.slots.map(formatSlot), [
    '8:00 AM to 10:00 AM',
    '4:00 PM to 8:00 PM',
  ]);
});

test('times render in 12-hour form, including midnight and noon', () => {
  assert.equal(formatTime('00:00'), '12:00 AM');
  assert.equal(formatTime('12:00'), '12:00 PM');
  assert.equal(formatTime('09:05'), '9:05 AM');
  assert.equal(formatTime('23:59'), '11:59 PM');
});

test('opening time counts as open and closing time counts as closed', () => {
  const days = hall('Stetson East').days;
  assert.equal(openState(days, at(5, '07:00')).open, true);
  assert.equal(openState(days, at(5, '20:59')).open, true);
  assert.equal(openState(days, at(5, '21:00')).open, false);
});

test('before opening, the next opening time is offered', () => {
  assert.deepEqual(
    openState(hall('Stetson East').days, at(5, '06:30')),
    { open: false, opensAt: '07:00' },
  );
});

test('between two windows, the later window is offered', () => {
  assert.deepEqual(
    openState(hall('60 Belvidere').days, at(0, '15:00')),
    { open: false, opensAt: '16:00' },
  );
});

test('a fully closed day offers nothing', () => {
  assert.deepEqual(
    openState(hall('60 Belvidere').days, at(5, '12:00')),
    { open: false, opensAt: null },
  );
});

test('live hours replace the fallback for that hall only', () => {
  const merged = mergeHours([{
    locationName: 'The Eatery at Stetson East',
    days: [{ day: 1, closed: false, slots: [{ opens: '09:00', closes: '17:00' }] }],
  }]);

  assert.deepEqual(merged.map(h => h.live), [true, false, false]);
  assert.deepEqual(
    groupWeek(merged[0].days).find(r => r.label === 'Mon').slots.map(formatSlot),
    ['9:00 AM to 5:00 PM'],
  );
  // The untouched hall keeps its bundled schedule.
  assert.deepEqual(
    groupWeek(merged[1].days)[0].slots.map(formatSlot),
    ['8:00 AM to 10:00 PM'],
  );
});

test('unknown halls and missing payloads fall back rather than throwing', () => {
  assert.equal(mergeHours(undefined).length, 3);
  assert.deepEqual(
    mergeHours([{ locationName: 'Nowhere Hall', days: [] }]).map(h => h.live),
    [false, false, false],
  );
  assert.deepEqual(groupWeek(undefined).length, 1);
});
