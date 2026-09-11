/**
 * Shared plumbing for the serverless functions under front-end/api.
 *
 * Vercel ignores files and folders in /api whose name starts with an
 * underscore, so this module ships with the functions without becoming a
 * route of its own.
 */
import { createClient } from '@supabase/supabase-js';

/** Missing or blank environment variables. Surfaces as a 503, not a crash. */
export class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
    this.status = 503;
  }
}

/** Any expected non-2xx outcome, thrown from inside a handler. */
export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.extra = extra;
  }
}

let client = null;
let clientOverride = null;

/**
 * Test seam. Pass a fake PostgREST client to run handlers without a database,
 * or null to restore normal behaviour.
 */
export function setSupabaseClient(fake) {
  clientOverride = fake;
}

/**
 * Build the Supabase admin client on first use.
 *
 * createClient() throws when the URL or key is missing. Calling it at module
 * scope meant a deployment with unset variables died during module evaluation,
 * before any handler ran, and Vercel returned an empty 500. Deferring the call
 * lets the wrapper below turn the same condition into a readable 503.
 */
export function getSupabase() {
  if (clientOverride) return clientOverride;
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new ConfigError(
      'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the deployment environment.'
    );
  }

  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

/** Today in Boston as YYYY-MM-DD, matching the date the scraper writes. */
export function today() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

/**
 * Whole days between a date and today on campus.
 *
 * Accepts either a YYYY-MM-DD date or a full timestamp. Used to tell callers
 * how old stored data is, because serving a three-month-old menu as though it
 * were today's is worse than serving nothing.
 */
export function ageInDays(value, reference = today()) {
  if (!value) return null;
  const text = String(value);
  const then = Date.parse(text.length <= 10 ? `${text}T00:00:00Z` : text);
  const now = Date.parse(`${reference}T00:00:00Z`);
  if (Number.isNaN(then) || Number.isNaN(now)) return null;
  return Math.max(0, Math.round((now - then) / 86_400_000));
}

/** Raise a Supabase error as an HttpError so the wrapper can format it. */
export function unwrap({ data, error }, context) {
  if (error) throw new HttpError(502, `${context}: ${error.message}`);
  return data;
}

/**
 * Wrap a handler so that nothing thrown inside it can take the function down.
 *
 * Without this, a rejected promise anywhere in the body produced a bare
 * FUNCTION_INVOCATION_FAILED with no JSON, which the frontend could only
 * report as a generic failure.
 */
export function withErrorHandling(handler) {
  return async function wrapped(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    try {
      await handler(req, res);
    } catch (err) {
      const status = Number(err?.status) || 500;
      if (status >= 500) console.error(`[api] ${req.method} ${req.url} failed:`, err);
      if (res.writableEnded || res.headersSent) return;
      res.status(status).json({
        error: err?.name === 'ConfigError' ? 'Server not configured' : 'Request failed',
        message: err?.message || 'Unknown error',
        ...(err?.extra || {}),
      });
    }
  };
}
