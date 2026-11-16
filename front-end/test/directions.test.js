import { test } from 'node:test';
import assert from 'node:assert/strict';
import { directionsUrl, hallBySlug } from '../src/data/halls.js';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)';
const ANDROID = 'Mozilla/5.0 (Linux; Android 15; Pixel 9)';

test('walking and transit directions open the right maps app with the right mode', () => {
  const iv = hallBySlug('international-village');
  assert.equal(directionsUrl(iv, 'walk', IPHONE), 'https://maps.apple.com/?daddr=International%20Village%2C%20Northeastern%20University%2C%20Boston%2C%20MA&dirflg=w');
  assert.equal(directionsUrl(iv, 'transit', IPHONE), 'https://maps.apple.com/?daddr=International%20Village%2C%20Northeastern%20University%2C%20Boston%2C%20MA&dirflg=r');
  assert.match(directionsUrl(iv, 'walk', ANDROID), /google\.com\/maps\/dir\/\?api=1&destination=.*&travelmode=walking$/);
  assert.match(directionsUrl(iv, 'transit', ANDROID), /&travelmode=transit$/);
});

test('every hall has a place to search for', () => {
  for (const slug of ['stetson-east', 'international-village', '60-belvidere']) {
    assert.ok(hallBySlug(slug).mapQuery, `${slug} has a mapQuery`);
  }
});
