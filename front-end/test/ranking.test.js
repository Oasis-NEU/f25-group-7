import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  answer, campusScore, dishId, nextComparison, placeIn, removeFrom, scoreAt, scoredList, startPlacement,
} from '../src/data/ranking.js';

/** Run a placement where the user's true taste is `truth` (best first). */
function place(bucketIds, candidateIds, newId, truth) {
  let state = startPlacement({ bucketIds, candidateIds });
  let guard = 0;
  while (!state.done && guard++ < 20) {
    const other = nextComparison(state);
    state = answer(state, truth.indexOf(newId) < truth.indexOf(other) ? 'new' : 'old');
  }
  return state;
}

test('a first dish in a bucket needs no comparisons', () => {
  const state = startPlacement({ bucketIds: [], candidateIds: [] });
  assert.equal(state.done, true);
  assert.equal(state.insertAt, 0);
});

test('binary placement finds the right spot in a handful of questions', () => {
  const truth = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const existing = truth.filter(x => x !== 'e');
  const state = place(existing, existing, 'e', truth);
  assert.equal(state.insertAt, existing.indexOf('f'));
  assert.ok(state.asked <= 3, `asked ${state.asked}`);
  assert.deepEqual(placeIn({ loved: existing }, 'e', 'loved', state.insertAt).loved, truth);
});

test('a dish is only compared with the same course, then placed in the full list', () => {
  const bucket = ['pasta', 'brownie', 'curry', 'cookie'];
  const mains = ['pasta', 'curry'];
  const truth = ['pasta', 'tacos', 'curry'];
  let state = startPlacement({ bucketIds: bucket, candidateIds: mains });
  const asked = [];
  while (!state.done) {
    const other = nextComparison(state);
    asked.push(other);
    state = answer(state, truth.indexOf('tacos') < truth.indexOf(other) ? 'new' : 'old');
  }
  assert.ok(asked.every(id => mains.includes(id)), 'never asked about a dessert');
  assert.deepEqual(placeIn({ loved: bucket }, 'tacos', 'loved', state.insertAt).loved, ['pasta', 'brownie', 'tacos', 'curry', 'cookie']);
});

test('"too tough" ends the questions and places the dish beside the one shown', () => {
  let state = startPlacement({ bucketIds: ['a', 'b', 'c'], candidateIds: ['a', 'b', 'c'] });
  assert.equal(nextComparison(state), 'b');
  state = answer(state, 'tie');
  assert.equal(state.done, true);
  assert.equal(state.insertAt, 1);
});

test('scores fall from the top of the bucket to the bottom', () => {
  assert.equal(scoreAt('loved', 0, 5), 10);
  assert.equal(scoreAt('loved', 4, 5), 6.8);
  assert.equal(scoreAt('disliked', 0, 1), 1.7);
  const list = scoredList({ loved: ['x', 'y'], fine: ['z'] });
  assert.deepEqual(list.map(d => d.id), ['x', 'y', 'z']);
  assert.ok(list[0].score > list[1].score && list[1].score > list[2].score);
});

test('re-ranking moves a dish between buckets, and removing it clears it', () => {
  const ranks = placeIn({ loved: ['a'], fine: ['b'] }, 'b', 'loved', 0);
  assert.deepEqual(ranks, { loved: ['b', 'a'], fine: [], disliked: [] });
  assert.deepEqual(removeFrom(ranks, 'a').loved, ['b']);
});

test('the campus score waits for three rankings and resists small samples', () => {
  assert.equal(campusScore({ loved: 2 }).score, null);
  const few = campusScore({ loved: 3 }).score;
  const many = campusScore({ loved: 30, fine: 4 }).score;
  assert.ok(few < many, `${few} should trail ${many}`);
  assert.ok(campusScore({ disliked: 10 }).score < 3);
});

test('dish ids are stable across days and safe as document ids', () => {
  assert.equal(dishId('stetson-east', 'Huli Huli Chicken'), 'stetson-east~huli-huli-chicken');
  assert.equal(dishId('stetson-east', 'Huli-Huli  Chicken!'), dishId('stetson-east', 'Huli Huli Chicken'));
  assert.ok(!dishId('iv', 'Mac & Cheese / Bowl').includes('/'));
});
