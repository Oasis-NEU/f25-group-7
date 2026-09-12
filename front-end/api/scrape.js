/**
 * Manual menu import from the DineOnCampus public API.
 *
 * Heads up: DineOnCampus is fronted by Cloudflare, which blocks datacenter
 * IP ranges, so this almost always fails when invoked from Vercel. The
 * supported path is backend-folder/run-scrape.js running from a residential
 * connection. This endpoint is kept for the case where the request does get
 * through, and it now reports the block clearly instead of timing out.
 */
import { getSupabase, today, unwrap, withErrorHandling, HttpError, ConfigError } from '../lib/api.js';

export const config = { maxDuration: 60 };

const SITE_ID = '5751fd2b90975b60e048929a';

const DINE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'application/json',
};

const ALLOWED_HALLS = ['Stetson', 'International', 'Belvidere'];

/** Fetch JSON, turning a Cloudflare challenge page into a legible error. */
async function fetchDineOnCampus(url) {
  let response;
  try {
    response = await fetch(url, { headers: DINE_HEADERS });
  } catch (err) {
    throw new HttpError(502, `Could not reach DineOnCampus: ${err.message}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (response.status === 403 || contentType.includes('text/html')) {
    throw new HttpError(
      503,
      'DineOnCampus blocked this request, which is what Cloudflare does to datacenter IPs.',
      { remedy: 'Run the scraper locally instead: cd backend-folder && node run-scrape.js' }
    );
  }
  if (!response.ok) {
    throw new HttpError(502, `DineOnCampus responded ${response.status} for ${url}`);
  }

  return response.json();
}

/** Insert rows in one round trip and return them keyed by the given field. */
async function insertMany(supabase, table, rows, keyFn) {
  if (rows.length === 0) return new Map();
  const inserted = unwrap(await supabase.from(table).insert(rows).select(), `inserting ${table}`);
  return new Map((inserted ?? []).map(row => [keyFn(row), row]));
}

async function handler(req, res) {
  // Without a secret this endpoint would let anyone write to the database,
  // so refuse to run rather than defaulting to open.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    throw new ConfigError('CRON_SECRET is not set, so this endpoint is disabled.');
  }
  if (req.headers.authorization !== `Bearer ${cronSecret}`) {
    throw new HttpError(401, 'Unauthorized');
  }

  const supabase = getSupabase();
  const date = today();

  const existing = unwrap(
    await supabase.from('menu_items').select('id').eq('date', date).limit(1),
    'checking for existing menu data'
  );
  if (existing?.length) {
    res.status(200).json({ date, skipped: true, message: `Menu data already exists for ${date}.` });
    return;
  }

  const locationsPayload = await fetchDineOnCampus(
    `https://api.dineoncampus.com/v1/sites/${SITE_ID}/locations?date=${date}`
  );

  const remoteLocations = (locationsPayload?.locations ?? []).filter(loc =>
    ALLOWED_HALLS.some(hall => loc.name?.includes(hall))
  );
  if (remoteLocations.length === 0) {
    throw new HttpError(404, 'DineOnCampus returned none of the three residential halls.');
  }

  let totalItems = 0;
  const warnings = [];

  for (const loc of remoteLocations) {
    const dbLocation = unwrap(
      await supabase
        .from('locations')
        .insert({
          original_id: loc.id,
          name: loc.name,
          type: loc.type,
          building_name: loc.building_name,
          sort_order: loc.sort_order,
          date,
        })
        .select()
        .single(),
      `inserting location ${loc.name}`
    );

    for (const period of loc.periods ?? []) {
      const dbPeriod = unwrap(
        await supabase
          .from('periods')
          .insert({ original_id: period.id, location_id: dbLocation.id, name: period.name, date })
          .select()
          .single(),
        `inserting period ${period.name}`
      );

      // Detailed menu carries the nutrients and dietary filters that the
      // locations payload omits. It is optional, so a failure only costs detail.
      const detailMap = new Map();
      try {
        const detailed = await fetchDineOnCampus(
          `https://apiv4.dineoncampus.com/locations/${loc.id}/menu?date=${date}&period=${period.id}`
        );
        for (const category of detailed?.period?.categories ?? []) {
          for (const item of category.items ?? []) detailMap.set(item.name, item);
        }
      } catch (err) {
        warnings.push(`details for ${loc.name} / ${period.name}: ${err.message}`);
      }

      const stations = period.stations ?? [];
      const stationRows = stations.map(station => ({
        original_id: station.id,
        period_id: dbPeriod.id,
        name: station.name,
        date,
      }));
      const stationsByName = await insertMany(supabase, 'stations', stationRows, row => row.name);

      // Build every item for this period, then write them in one call.
      const itemRows = [];
      for (const station of stations) {
        const dbStation = stationsByName.get(station.name);
        if (!dbStation) continue;

        for (const item of station.items ?? []) {
          const detail = detailMap.get(item.name);
          const filters = detail?.filters ?? [];
          const isVegan = filters.some(f => f.name === 'Vegan');

          itemRows.push({
            station_id: dbStation.id,
            original_id: detail?.id ?? null,
            name: item.name,
            calories: item.calories ?? null,
            portion: item.portion ?? null,
            date,
            is_vegetarian: isVegan || filters.some(f => f.name === 'Vegetarian'),
            is_vegan: isVegan,
            is_high_protein: filters.some(f => f.name === 'Good Source of Protein'),
          });
        }
      }

      const itemsByKey = await insertMany(
        supabase,
        'menu_items',
        itemRows,
        row => `${row.station_id}::${row.name}`
      );
      totalItems += itemRows.length;

      const nutrientRows = [];
      for (const row of itemRows) {
        const dbItem = itemsByKey.get(`${row.station_id}::${row.name}`);
        const detail = detailMap.get(row.name);
        if (!dbItem || !detail?.nutrients?.length) continue;

        for (const nutrient of detail.nutrients) {
          nutrientRows.push({
            menu_item_id: dbItem.id,
            name: nutrient.name,
            value: nutrient.value,
            uom: nutrient.uom,
            value_numeric: Number.parseFloat(nutrient.valueNumeric) || null,
          });
        }
      }

      if (nutrientRows.length) {
        unwrap(await supabase.from('nutrients').insert(nutrientRows), 'inserting nutrients');
      }
    }
  }

  unwrap(
    await supabase
      .from('steast_vs_iv')
      .upsert({ date, steast: 0, iv: 0 }, { onConflict: 'date', ignoreDuplicates: true }),
    'seeding the vote row'
  );

  res.status(200).json({
    date,
    totalItems,
    warnings: warnings.length ? warnings : undefined,
    ok: true,
  });
}

export default withErrorHandling(handler);
