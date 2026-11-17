import { test } from 'node:test';
import assert from 'node:assert/strict';
import { directionsUrl, hallBySlug } from '../src/data/halls.js';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)';
const ANDROID = 'Mozilla/5.0 (Linux; Android 15; Pixel 9)';

test('directions open the right maps app without forcing a travel mode', () => {
  const iv = hallBySlug('international-village');
  assert.equal(directionsUrl(iv, IPHONE), 'https://maps.apple.com/?daddr=International%20Village%2C%20Northeastern%20University%2C%20Boston%2C%20MA');
  assert.equal(directionsUrl(iv, ANDROID), 'https://www.google.com/maps/dir/?api=1&destination=International%20Village%2C%20Northeastern%20University%2C%20Boston%2C%20MA');
});

test('every hall has a place to search for', () => {
  for (const slug of ['stetson-east', 'international-village', '60-belvidere']) {
    assert.ok(hallBySlug(slug).mapQuery, `${slug} has a mapQuery`);
  }
});
