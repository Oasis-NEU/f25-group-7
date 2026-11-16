/**
 * Health check, and the daily keep-alive for Supabase.
 *
 * Supabase pauses free-tier projects after about a week without traffic, and
 * a paused project takes sign-in, votes and the tracker down with it. Vercel
 * cron calls this once a day (see vercel.json), and a single cheap read is
 * enough to count as activity. GitHub Actions does the same as a backup
 * (.github/workflows/keep-supabase-awake.yml).
 *
 * Menus and hours do not depend on this: the browser reads them from
 * DineOnCampus directly.
 */
import { getSupabase, withErrorHandling } from '../lib/api.js';

async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const started = Date.now();

  let database = 'up';
  let detail = null;
  try {
    const { error } = await getSupabase().from('hall_hours').select('id').limit(1);
    if (error) { database = 'error'; detail = error.message; }
  } catch (err) {
    database = err?.name === 'ConfigError' ? 'not-configured' : 'down';
    detail = err?.message ?? String(err);
  }

  const ok = database === 'up';
  res.status(ok ? 200 : 503).json({
    ok,
    database,
    detail,
    ms: Date.now() - started,
    checkedAt: new Date().toISOString(),
  });
}

export default withErrorHandling(handler);
