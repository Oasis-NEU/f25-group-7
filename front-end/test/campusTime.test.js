import { test } from 'node:test';
import assert from 'node:assert/strict';

import { campusDate, campusDateOffset, campusNow } from '../src/functions/campusTime.js';

test('campusDate is an ISO calendar date', () => {
  assert.match(campusDate(), /^\d{4}-\d{2}-\d{2}$/);
});

test('an offset of zero is today', () => {
  assert.equal(campusDateOffset(0), campusDate());
});

test('a seven day window is contiguous and ends today', () => {
  const week = Array.from({ length: 7 }, (_, i) => campusDateOffset(i - 6));
  assert.equal(week.length, 7);
  assert.equal(week[6], campusDate());
  for (let i = 1; i < week.length; i++) {
    const gap = (Date.parse(`${week[i]}T00:00:00Z`) - Date.parse(`${week[i - 1]}T00:00:00Z`)) / 86_400_000;
    assert.equal(gap, 1, `${week[i - 1]} to ${week[i]} is not one day`);
  }
});

test('calendar arithmetic survives month, year, leap and DST boundaries', () => {
  const cases = [
    ['2026-01-03', '2025-12-28'],  // back across a year
    ['2026-03-02', '2026-02-24'],  // back across a short month
    ['2024-03-02', '2024-02-25'],  // leap year
    ['2026-11-02', '2026-10-27'],  // US daylight saving ends Nov 1
    ['2026-03-10', '2026-03-04'],  // US daylight saving starts Mar 8
  ];
  for (const [today, expected] of cases) {
    // Midday UTC keeps the reference date stable in Eastern time.
    const reference = new Date(`${today}T12:00:00Z`);
    assert.equal(campusDateOffset(-6, reference), expected, `six days before ${today}`);
  }
});

test('campusNow reports a weekday index and minutes past midnight', () => {
  const now = campusNow();
  assert.ok(now.day >= 0 && now.day <= 6, `day out of range: ${now.day}`);
  assert.ok(now.minutes >= 0 && now.minutes < 1440, `minutes out of range: ${now.minutes}`);
});

test('midnight on campus is minute zero, not minute 1440', () => {
  // 04:30 UTC is 00:30 Eastern during daylight saving.
  const now = campusNow(new Date('2026-09-11T04:30:00Z'));
  assert.equal(now.minutes, 30);
});
