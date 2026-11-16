/**
 * fetch with a deadline, a retry and errors that say what went wrong.
 *
 * A request that hangs is worse than one that fails, because the page sits on
 * a spinner and never reaches its fallback. Every network call in the app
 * goes through here so that none of them can wait forever.
 */

export class FetchError extends Error {
  constructor(message, { kind, status, url } = {}) {
    super(message);
    this.name = 'FetchError';
    /** 'timeout' | 'network' | 'http' | 'parse' | 'upstream' */
    this.kind = kind;
    this.status = status ?? null;
    this.url = url;
  }
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/** Errors worth a second attempt: the network, a timeout or a 5xx. */
function retryable(error) {
  return error.kind === 'timeout' || error.kind === 'network'
    || (error.kind === 'http' && error.status >= 500);
}

async function attempt(url, { timeoutMs, signal, fetchImpl }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });

  let response;
  try {
    response = await fetchImpl(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      credentials: 'omit',
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    const timedOut = controller.signal.aborted;
    throw new FetchError(
      timedOut ? `No response within ${Math.round(timeoutMs / 1000)}s` : 'The request could not be sent',
      { kind: timedOut ? 'timeout' : 'network', url }
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }

  const text = await response.text().catch(() => '');
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // An HTML page here is almost always a Cloudflare block or challenge.
    throw new FetchError(
      response.ok ? 'The response was not JSON' : `HTTP ${response.status}`,
      { kind: response.ok ? 'parse' : 'http', status: response.status, url }
    );
  }

  if (!response.ok) {
    const error = new FetchError(body?.message || `HTTP ${response.status}`, {
      kind: 'http', status: response.status, url,
    });
    error.body = body;
    throw error;
  }
  return body;
}

/**
 * GET a JSON document.
 *
 * Options: timeoutMs (default 12s), retries (default 1), signal, fetchImpl.
 */
export async function getJson(url, options = {}) {
  const {
    timeoutMs = 12_000,
    retries = 1,
    signal,
    fetchImpl = globalThis.fetch?.bind(globalThis),
  } = options;

  if (!fetchImpl) throw new FetchError('fetch is not available', { kind: 'network', url });

  let lastError;
  for (let i = 0; i <= retries; i++) {
    try {
      return await attempt(url, { timeoutMs, signal, fetchImpl });
    } catch (err) {
      if (signal?.aborted || !(err instanceof FetchError) || !retryable(err) || i === retries) throw err;
      lastError = err;
      await sleep(600 * (i + 1));
    }
  }
  throw lastError;
}
