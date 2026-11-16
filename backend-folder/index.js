/**
 * Local development API.
 *
 * Mirrors the Vercel functions in front-end/api so that `npm run dev` behaves
 * the same as production. Vite proxies /api here (see front-end/vite.config.js).
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
// 3000 collides with almost every other dev server, so default higher.
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend-folder/.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

const HALLS = {
  'stetson-east':          'The Eatery at Stetson East',
  'steast':                'The Eatery at Stetson East',
  'international-village': 'United Table at International Village',
  'iv':                    'United Table at International Village',
  '60-belvidere':          'Campus Roots at 60 Belvidere',
  'belvidere':             'Campus Roots at 60 Belvidere',
};

const MEALS = {
  breakfast: 'Breakfast',
  lunch:     'Lunch',
  dinner:    'Dinner',
  brunch:    'Brunch',
};

/**
 * Today in Boston as YYYY-MM-DD. Assembled from parts because the en-CA short
 * date has changed shape between ICU releases.
 */
function today(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const get = type => parts.find(part => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}


/**
 * How far back the fallback will reach when today has not been scraped.
 * Beyond this the pipeline is broken rather than merely late.
 */
const MAX_FALLBACK_AGE_DAYS = 14;

/** Whole days between a date or timestamp and today on campus. */
function ageInDays(value, reference = today()) {
  if (!value) return null;
  const text = String(value);
  const then = Date.parse(text.length <= 10 ? `${text}T00:00:00Z` : text);
  const now = Date.parse(`${reference}T00:00:00Z`);
  if (Number.isNaN(then) || Number.isNaN(now)) return null;
  return Math.max(0, Math.round((now - then) / 86400000));
}

class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

function unwrap({ data, error }, context) {
  if (error) throw new HttpError(502, `${context}: ${error.message}`);
  return data;
}

/** Route wrapper so a rejected promise returns JSON instead of hanging. */
function route(handler) {
  return (req, res) => {
    Promise.resolve(handler(req, res)).catch(err => {
      const status = Number(err?.status) || 500;
      if (status >= 500) console.error(`${req.method} ${req.originalUrl} failed:`, err);
      if (res.headersSent) return;
      res.status(status).json({
        error: 'Request failed',
        message: err?.message || 'Unknown error',
        ...(err?.extra || {}),
      });
    });
  };
}

app.get('/api/menu/:hall/:meal', route(async (req, res) => {
  const hallSlug = String(req.params.hall || '').toLowerCase();
  const mealSlug = String(req.params.meal || '').toLowerCase();
  if (!hallSlug || !mealSlug) throw new HttpError(400, 'Both a hall and a meal are required.');

  const locationName = HALLS[hallSlug] || hallSlug;
  const periodName = MEALS[mealSlug] || mealSlug;

  const currentDate = today();
  let dateToUse = currentDate;

  let locations = unwrap(
    await supabase
      .from('locations').select('id, name, date')
      .eq('name', locationName).eq('date', currentDate),
    'looking up locations'
  );

  // Nothing scraped for today yet, so show the most recent day we do have.
  if (!locations || locations.length === 0) {
    const latest = unwrap(
      await supabase
        .from('locations').select('id, name, date')
        .eq('name', locationName)
        .order('date', { ascending: false }).limit(10),
      'looking up the most recent locations'
    );
    if (latest && latest.length) {
      locations = latest;
      dateToUse = latest[0].date;
    }
  }

  // Today has location rows but no periods, which is what a scrape that died
  // partway through leaves behind. Prefer the last complete day.
  if (locations && locations.length && dateToUse === currentDate) {
    const periods = unwrap(
      await supabase
        .from('periods').select('id')
        .in('location_id', locations.map(l => l.id)).limit(1),
      'checking for periods'
    );
    if (!periods || periods.length === 0) {
      const previous = unwrap(
        await supabase
          .from('locations').select('id, name, date')
          .eq('name', locationName).neq('date', currentDate)
          .order('date', { ascending: false }).limit(10),
        'looking up previous locations'
      );
      if (previous && previous.length) {
        locations = previous;
        dateToUse = previous[0].date;
      }
    }
  }

  if (!locations || locations.length === 0) {
    throw new HttpError(404, `No menu data stored for ${locationName}.`, {
      code: 'NO_MENU_DATA',
      hint: 'Run the scraper from a residential IP: cd backend-folder && node run-scrape.js',
    });
  }

  const age = ageInDays(dateToUse, currentDate) || 0;
  if (age > MAX_FALLBACK_AGE_DAYS) {
    throw new HttpError(404, `The newest stored menu for ${locationName} is ${age} days old.`, {
      code: 'NO_MENU_DATA',
      ageDays: age,
      hint: 'The scraper has not run recently: cd backend-folder && node run-scrape.js',
    });
  }

  let location = null;
  let period = null;

  for (const loc of locations) {
    const periods = unwrap(
      await supabase
        .from('periods').select('id, name, date')
        .eq('location_id', loc.id).eq('name', periodName).eq('date', dateToUse),
      'looking up periods'
    );

    for (const candidate of periods || []) {
      const stations = unwrap(
        await supabase
          .from('stations').select('id')
          .eq('period_id', candidate.id).eq('date', dateToUse).limit(1),
        'checking for stations'
      );
      if (stations && stations.length) {
        location = loc;
        period = candidate;
        break;
      }
    }
    if (period) break;
  }

  if (!period) {
    throw new HttpError(404, `No ${periodName} menu for ${locationName} on ${dateToUse}.`, {
      code: 'PERIOD_NOT_SERVED',
    });
  }

  const stations = unwrap(
    await supabase
      .from('stations').select('id, name')
      .eq('period_id', period.id).eq('date', dateToUse),
    'fetching stations'
  );

  if (!stations || stations.length === 0) {
    return res.json({
      location: location.name, period: period.name, date: dateToUse, ageDays: age, items: [], totalItems: 0,
    });
  }

  const stationIds = stations.map(s => s.id);

  // The embedded select needs the nutrients foreign key to be visible to
  // PostgREST. Fall back to flat columns rather than failing the request.
  const joined = await supabase
    .from('menu_items')
    .select(`
      id, name, calories, portion, is_vegetarian, is_vegan, is_high_protein, station_id,
      nutrients(name, value, uom, value_numeric)
    `)
    .eq('date', dateToUse).in('station_id', stationIds);

  let items;
  if (joined.error) {
    console.warn('nutrient join unavailable, using flat columns:', joined.error.message);
    items = unwrap(
      await supabase
        .from('menu_items')
        .select('id, name, calories, portion, is_vegetarian, is_vegan, is_high_protein, station_id')
        .eq('date', dateToUse).in('station_id', stationIds),
      'fetching menu items'
    );
  } else {
    items = joined.data;
  }

  const stationNames = Object.fromEntries(stations.map(s => [s.id, s.name]));

  const formatted = (items || []).map(item => {
    const nutrients = item.nutrients || [];
    const find = keyword => {
      const match = nutrients.find(n => (n.name || '').toLowerCase().includes(keyword));
      return match ? `${match.value}${match.uom ? ` ${match.uom}` : ''}`.trim() : null;
    };
    return {
      id: item.id,
      name: item.name,
      calories: item.calories != null ? item.calories : null,
      portion: item.portion || null,
      station: stationNames[item.station_id] || null,
      isVegetarian: Boolean(item.is_vegetarian),
      isVegan: Boolean(item.is_vegan),
      isHighProtein: Boolean(item.is_high_protein),
      protein: find('protein'),
      fat: find('total fat'),
      carbs: find('total carbohydrate'),
      fiber: find('dietary fiber'),
      sodium: find('sodium'),
      sugar: find('total sugar'),
      description: null,
    };
  });

  res.json({
    location: location.name,
    period: period.name,
    date: dateToUse,
    ageDays: age,
    items: formatted,
    totalItems: formatted.length,
  });
}));

app.get('/api/hours', route(async (req, res) => {
  const { data, error } = await supabase
    .from('hall_hours')
    .select('location_name, day_of_week, slot_index, opens_at, closes_at, closed, fetched_at')
    .order('location_name').order('day_of_week').order('slot_index');

  // A missing table just means the migration has not been applied yet, which
  // the page handles by showing its bundled schedule.
  const missingTable = error && (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    /does not exist|could not find the table/i.test(error.message || '')
  );
  if (error && !missingTable) throw new HttpError(502, `Reading hall_hours: ${error.message}`);

  const rows = error ? [] : (data || []);
  if (rows.length === 0) {
    return res.json({ source: 'empty', fetchedAt: null, ageDays: null, halls: [] });
  }

  const toHourMinute = value => {
    const match = typeof value === 'string' ? value.match(/^(\d{2}):(\d{2})/) : null;
    return match ? `${match[1]}:${match[2]}` : null;
  };

  const byLocation = new Map();
  let newestFetch = null;

  for (const row of rows) {
    if (!byLocation.has(row.location_name)) byLocation.set(row.location_name, new Map());
    const days = byLocation.get(row.location_name);
    if (!days.has(row.day_of_week)) {
      days.set(row.day_of_week, { day: row.day_of_week, closed: true, slots: [] });
    }

    const day = days.get(row.day_of_week);
    const opens = toHourMinute(row.opens_at);
    const closes = toHourMinute(row.closes_at);
    if (!row.closed && opens && closes) {
      day.slots.push({ opens, closes });
      day.closed = false;
    }

    if (row.fetched_at && (!newestFetch || row.fetched_at > newestFetch)) newestFetch = row.fetched_at;
  }

  const halls = [...byLocation.entries()].map(([locationName, days]) => ({
    locationName,
    days: [...days.values()].sort((a, b) => a.day - b.day),
  }));

  res.json({ source: 'live', fetchedAt: newestFetch, ageDays: ageInDays(newestFetch), halls });
}));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({
    message: 'NU Rate-ON development API',
    endpoints: {
      menu: '/api/menu/:hall/:meal',
      hours: '/api/hours',
      health: '/health',
    },
  });
});

app.listen(PORT, () => {
  console.log(`Development API listening on http://localhost:${PORT}`);
});
