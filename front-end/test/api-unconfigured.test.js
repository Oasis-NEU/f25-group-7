/**
 * Runs in its own process with no Supabase environment, which is how a
 * misconfigured deployment behaves. Previously this crashed the function
 * during module evaluation and returned an empty 500.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { invoke } from './helpers/supabase-stub.js';
import hoursHandler from '../api/hours.js';
import menuHandler from '../api/menu/[hall]/[meal].js';
import scrapeHandler from '../api/scrape.js';

delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.CRON_SECRET;

test('the menu endpoint reports a configuration problem as 503 JSON', async () => {
  const res = await invoke(menuHandler, { query: { hall: 'steast', meal: 'lunch' } });
  assert.equal(res.code, 503);
  assert.equal(res.body.error, 'Server not configured');
  assert.match(res.body.message, /SUPABASE_URL/);
});

test('the hours endpoint reports a configuration problem as 503 JSON', async () => {
  const res = await invoke(hoursHandler);
  assert.equal(res.code, 503);
});

test('the scrape endpoint refuses to run without a cron secret', async () => {
  const res = await invoke(scrapeHandler, { method: 'POST' });
  assert.equal(res.code, 503);
  assert.match(res.body.message, /CRON_SECRET/);
});

test('the scrape endpoint rejects a missing or wrong bearer token', async () => {
  process.env.CRON_SECRET = 'test-secret';

  assert.equal((await invoke(scrapeHandler, { method: 'POST' })).code, 401);
  assert.equal(
    (await invoke(scrapeHandler, { method: 'POST', headers: { authorization: 'Bearer wrong' } })).code,
    401,
  );

  // Correct secret, but Supabase is still unset, so it stops at configuration.
  const ok = await invoke(scrapeHandler, {
    method: 'POST',
    headers: { authorization: 'Bearer test-secret' },
  });
  assert.equal(ok.code, 503);

  delete process.env.CRON_SECRET;
});
