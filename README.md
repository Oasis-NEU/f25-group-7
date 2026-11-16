# NU Dining

Menus, opening hours, dish rankings, meal voting and a nutrition tracker for
Northeastern's three residential dining halls.

- `front-end/` React app (Vite) plus the Vercel serverless functions in `front-end/api/`
- `backend-folder/` the development API and the DineOnCampus scraper
- `firestore.rules`, `firebase.json` accounts and community data on Firebase
- `supabase/migrations/` schema for the optional scraper cache (fallback 2 below)

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

The frontend needs the four `VITE_FIREBASE_*` values (see below). Vite inlines
`VITE_*` values at build time, so changing them needs a rebuild. Menus and
hours need no configuration at all.

## Running

```bash
npm run dev      # dev API on :3001 and the UI on :5173
npm test         # unit and API handler tests
npm run lint
npm run build
```

If something already owns port 3001, point both ends elsewhere:

```bash
PORT=3021 npm run dev:backend
API_PROXY_TARGET=http://localhost:3021 npm run dev:frontend
```

## Where menus and hours come from

**The browser reads them straight from DineOnCampus.** Its v1 API
(`api.dineoncampus.com/v1`) sends `Access-Control-Allow-Origin: *`, and the
Cloudflare rules that block cloud servers let real browsers through, so the
site does not depend on anyone running a scraper. See `front-end/src/data/`.

Each page falls back in order, and says which source it is showing:

| | Menus (`data/menu.js`) | Hours (`data/schedule.js`) |
|---|---|---|
| 1 | DineOnCampus, live | DineOnCampus, live (this week and next) |
| 2 | `/api/menu` (scraper data in Supabase, today only) | `/api/hours` (scraper data) |
| 3 | The copy this browser saved last time | The copy this browser saved last time |
| 4 | A clear "couldn't load" state with a retry and a link to the official site | The schedule bundled in `src/functions/hours.js`, labelled with its date |

Every request has a timeout and one retry, so nothing can sit on a spinner
forever. If a hall's DineOnCampus id stops resolving, the client finds the
hall again by name in the location list and remembers the new id.

Things this cannot protect against, because they are outside our control:
DineOnCampus retiring or changing the v1 API, or Cloudflare starting to
challenge real browsers. Both would show up as the fallbacks above, and
`npm test` uses real captured responses in `test/fixtures/`, so a format
change is quick to diagnose.

### The scraper is now optional

`npm run scrape` still fills Supabase, which feeds fallback 2. It has to run
from a residential connection with a real Chrome window, because Cloudflare
blocks datacenter IPs (GitHub Actions, Vercel). `front-end/api/scrape.js` is
the same import as a serverless function and refuses to run unless
`CRON_SECRET` is set.

## Accounts and rankings (Firebase)

Sign-in, dish rankings, votes and the tracker run on Firebase Auth and
Firestore, on the free Spark plan. Spark projects do not pause when idle the
way Supabase's free tier does; if a daily quota runs out, those features stop
until the next day and nothing is billed. Menus and hours never touch Firebase.

One-time setup:

1. Create a project at console.firebase.google.com (no billing account needed).
2. **Authentication > Sign-in method:** enable Email/Password.
3. **Authentication > Settings > Authorized domains:** add the Vercel domain.
4. **Authentication > Templates:** optionally set the action URL to
   `https://<your domain>/reset-password` so reset links open this app.
5. **Firestore Database:** create it in production mode, then deploy the rules
   from the repo root: `firebase deploy --only firestore:rules --project <id>`.
6. **Project settings > Your apps:** add a web app and copy its config into
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
   `VITE_FIREBASE_PROJECT_ID` and `VITE_FIREBASE_APP_ID`, both in
   `front-end/.env` and in the Vercel project, then redeploy.

Only verified `@northeastern.edu` accounts can rank dishes or vote; the rules
in `firestore.rules` enforce that, and also tie every campus counter change to
the writer's own ranking in the same batch, so each person counts once per
dish. A campus score shows once three people have ranked a dish.

Local development against the emulators (needs Java):

```bash
npm run emulators --prefix front-end   # auth on :9099, Firestore on :8080
VITE_FIREBASE_EMULATOR=1 VITE_FIREBASE_PROJECT_ID=demo-nu-dining npm run dev:frontend
npm run test:rules --prefix front-end  # security rules tests
```

Verification emails are not sent by the emulator; open the link from
`http://127.0.0.1:9099/emulator/v1/projects/demo-nu-dining/oobCodes`.

The old Supabase project is gone. `/api/menu`, `/api/hours` and `npm run scrape` only matter if
you set up a new scraper cache; without one, fallback 2 is skipped and menus still load live.

## Notes

- Everything is anchored to `America/New_York`, not the browser clock. Use the
  helpers in `front-end/src/functions/campusTime.js` for any date or time that
  is compared against stored data.
- The two 404 codes from the menu API are load-bearing: `PERIOD_NOT_SERVED`
  means the hall genuinely does not serve that meal, while a bare 404 means the
  route or a proxy is broken. The client must not conflate them.
