/**
 * In-memory stand-in for the Supabase PostgREST query builder.
 *
 * Only the subset the handlers use is implemented. Seed rows with
 * `setRows({ table: [...] })` and force failures with
 * `setRows({ __errors: { table: { code, message } } })`.
 */
let db = {};

export function setRows(next) {
  db = next ?? {};
}

class Query {
  constructor(table) {
    this.table = table;
    this.filters = [];
    this.orders = [];
    this.rowLimit = null;
    this.single = null;
  }

  select() { return this; }
  insert() { return this; }
  delete() { return this; }
  upsert() { return this; }

  eq(column, value)  { this.filters.push(row => row[column] === value); return this; }
  neq(column, value) { this.filters.push(row => row[column] !== value); return this; }
  in(column, values) { this.filters.push(row => values.includes(row[column])); return this; }

  order(column, options = {}) {
    this.orders.push([column, options.ascending !== false]);
    return this;
  }

  limit(n) { this.rowLimit = n; return this; }
  maybeSingle() { this.single = 'maybe'; return this; }

  run() {
    if (db.__errors?.[this.table]) return { data: null, error: db.__errors[this.table] };

    let rows = (db[this.table] ?? []).filter(row => this.filters.every(f => f(row)));

    for (const [column, ascending] of [...this.orders].reverse()) {
      rows = [...rows].sort((a, b) => {
        const order = (a[column] > b[column]) - (a[column] < b[column]);
        return ascending ? order : -order;
      });
    }

    if (this.rowLimit != null) rows = rows.slice(0, this.rowLimit);
    if (this.single) return { data: rows[0] ?? null, error: null };
    return { data: rows, error: null };
  }

  // Awaiting the builder is what triggers the query, same as the real client.
  then(onFulfilled, onRejected) {
    return Promise.resolve(this.run()).then(onFulfilled, onRejected);
  }
}

export const stubClient = { from: table => new Query(table) };

/** Minimal Vercel-style response recorder. */
export function mockResponse() {
  const res = {
    code: 200,
    body: null,
    headers: {},
    ended: false,
    headersSent: false,
    writableEnded: false,
  };
  res.setHeader = (key, value) => { res.headers[key] = value; };
  res.status = code => { res.code = code; return res; };
  res.json = body => {
    res.body = body;
    res.headersSent = true;
    res.writableEnded = true;
    return res;
  };
  res.end = () => {
    res.ended = true;
    res.headersSent = true;
    res.writableEnded = true;
    return res;
  };
  return res;
}

/** Invoke a handler and return the recorded response. */
export async function invoke(handler, req = {}) {
  const res = mockResponse();
  await handler({ method: 'GET', url: '/test', headers: {}, query: {}, ...req }, res);
  return res;
}
