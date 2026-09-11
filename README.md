# NU Dining

Menus, opening hours, meal voting and a nutrition tracker for Northeastern's
three residential dining halls.

- `front-end/` React app (Vite) plus the Vercel serverless functions in `front-end/api/`
- `backend-folder/` the development API and the DineOnCampus scraper
- `supabase/migrations/` database schema, applied in filename order

## Setup

```bash
npm install
npm install --prefix front-end
npm install --prefix backend-folder
```

Copy both env templates and fill them in:

```bash
cp front-end/.env.example front-end/.env
cp backend-folder/.env.example backend-folder/.env
```

The frontend needs the project URL and the anon key. The backend and the
serverless functions need the **service role** key, which must never reach the
browser. Vite inlines `VITE_*` values at build time, so changing them needs a
rebuild.

Apply the migrations in `supabase/migrations/` in order, through the Supabase
SQL editor or the CLI.

## Running

```bash
npm run dev      # dev API on :3000 and the UI on :5173
npm test         # unit and API handler tests
npm run lint
npm run build
```

If something already owns port 3000, point the proxy elsewhere:

```bash
PORT=3011 npm run dev:backend
API_PROXY_TARGET=http://localhost:3011 npm run dev:frontend
```

## Loading menu and hours data

DineOnCampus sits behind Cloudflare, which blocks datacenter IP ranges. That
rules out GitHub Actions and Vercel cron, so **the scraper has to run from a
residential connection**:

```bash
npm run scrape
```

Two consequences worth knowing:

- It drives a real Chrome window, because Cloudflare is much harder to get past
  headless. A scheduled run therefore needs a logged-in desktop session; a plain
  headless cron will not work. `SCRAPE_HEADLESS=true` overrides this if you want
  to try. Set `CHROME_PATH` if your browser is somewhere unusual.
- It exits non-zero and prints a numbered problem list on failure, so a cron log
  shows when the pipeline has stopped.

`front-end/api/scrape.js` is the same import as a serverless function. It is
kept for the case where a request gets through, and reports the Cloudflare block
clearly rather than timing out. It refuses to run unless `CRON_SECRET` is set.

## Staleness

Stale data is treated as a first-class failure, because a menu that is quietly
three months old is worse than no menu:

- `/api/menu/:hall/:meal` falls back to the most recent stored day, returns an
  `ageDays` field, and withholds anything older than 14 days with
  `code: 'NO_MENU_DATA'`. The UI labels any menu that is not today's.
- `/api/hours` returns `ageDays` from the newest synced row. The hours page
  shows how long ago it synced, and warns after 30 days that the schedule may be
  from a previous semester. If no hours are stored it falls back to a bundled
  schedule and says so.

Update the bundled fallback in `front-end/src/functions/hours.js` each semester
and bump `FALLBACK_UPDATED`.

## Notes

- Everything is anchored to `America/New_York`, not the browser clock. Use the
  helpers in `front-end/src/functions/campusTime.js` for any date or time that
  is compared against stored data.
- The two 404 codes from the menu API are load-bearing: `PERIOD_NOT_SERVED`
  means the hall genuinely does not serve that meal, while a bare 404 means the
  route or a proxy is broken. The client must not conflate them.
