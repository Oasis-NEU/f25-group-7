import { ageInDays, getSupabase, today, unwrap, withErrorHandling, HttpError } from '../../../lib/api.js';

/**
 * How far back the fallback will reach when today has not been scraped.
 * Beyond this the pipeline is broken rather than merely late, and a menu that
 * old would misinform someone deciding where to eat right now.
 */
const MAX_FALLBACK_AGE_DAYS = 14;

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

/** Read a route parameter, rejecting anything that is not a usable string. */
function param(value, name) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new HttpError(400, `Missing "${name}" in the request path.`);
  }
  return raw.trim().toLowerCase();
}

async function handler(req, res) {
  const supabase = getSupabase();

  const hallSlug = param(req.query?.hall, 'hall');
  const mealSlug = param(req.query?.meal, 'meal');
  const locationName = HALLS[hallSlug] ?? hallSlug;
  const periodName = MEALS[mealSlug] ?? mealSlug;

  const currentDate = today();
  let dateToUse = currentDate;

  let locations = unwrap(
    await supabase
      .from('locations')
      .select('id, name, date')
      .eq('name', locationName)
      .eq('date', currentDate),
    'looking up locations'
  );

  // Nothing scraped for today yet, so show the most recent day we do have.
  if (!locations?.length) {
    const latest = unwrap(
      await supabase
        .from('locations')
        .select('id, name, date')
        .eq('name', locationName)
        .order('date', { ascending: false })
        .limit(10),
      'looking up the most recent locations'
    );
    if (latest?.length) {
      locations = latest;
      dateToUse = latest[0].date;
    }
  }

  // Today has location rows but no periods, which is what a scrape that died
  // partway through leaves behind. Prefer the last complete day over an empty page.
  if (locations?.length && dateToUse === currentDate) {
    const periods = unwrap(
      await supabase
        .from('periods')
        .select('id')
        .in('location_id', locations.map(l => l.id))
        .limit(1),
      'checking for periods'
    );
    if (!periods?.length) {
      const previous = unwrap(
        await supabase
          .from('locations')
          .select('id, name, date')
          .eq('name', locationName)
          .neq('date', currentDate)
          .order('date', { ascending: false })
          .limit(10),
        'looking up previous locations'
      );
      if (previous?.length) {
        locations = previous;
        dateToUse = previous[0].date;
      }
    }
  }

  if (!locations?.length) {
    throw new HttpError(404, `No menu data stored for ${locationName}.`, {
      code: 'NO_MENU_DATA',
      hint: 'Run the scraper from a residential IP: cd backend-folder && node run-scrape.js',
    });
  }

  const age = ageInDays(dateToUse, currentDate) ?? 0;
  if (age > MAX_FALLBACK_AGE_DAYS) {
    throw new HttpError(404, `The newest stored menu for ${locationName} is ${age} days old.`, {
      code: 'NO_MENU_DATA',
      ageDays: age,
      hint: 'The scraper has not run recently: cd backend-folder && node run-scrape.js',
    });
  }

  // Pick the first location/period pair that actually has stations attached.
  let location = null;
  let period = null;

  for (const loc of locations) {
    const periods = unwrap(
      await supabase
        .from('periods')
        .select('id, name, date')
        .eq('location_id', loc.id)
        .eq('name', periodName)
        .eq('date', dateToUse),
      'looking up periods'
    );

    for (const candidate of periods ?? []) {
      const stations = unwrap(
        await supabase
          .from('stations')
          .select('id')
          .eq('period_id', candidate.id)
          .eq('date', dateToUse)
          .limit(1),
        'checking for stations'
      );
      if (stations?.length) {
        location = loc;
        period = candidate;
        break;
      }
    }
    if (period) break;
  }

  if (!period) {
    // Tagged so the client can tell "this hall does not serve this meal" apart
    // from a 404 produced by a dead route or a proxy in front of us.
    throw new HttpError(404, `No ${periodName} menu for ${locationName} on ${dateToUse}.`, {
      code: 'PERIOD_NOT_SERVED',
    });
  }

  const stations = unwrap(
    await supabase
      .from('stations')
      .select('id, name')
      .eq('period_id', period.id)
      .eq('date', dateToUse),
    'fetching stations'
  );

  if (!stations?.length) {
    res.status(200).json({
      location: location.name,
      period: period.name,
      date: dateToUse,
      ageDays: age,
      items: [],
      totalItems: 0,
    });
    return;
  }

  const stationIds = stations.map(s => s.id);

  // The embedded select needs the nutrients foreign key to be visible to
  // PostgREST. If the relationship is missing the query errors, so fall back
  // to the flat columns rather than failing the whole request.
  let items;
  const joined = await supabase
    .from('menu_items')
    .select(`
      id, name, calories, portion, is_vegetarian, is_vegan, is_high_protein, station_id,
      nutrients(name, value, uom, value_numeric)
    `)
    .eq('date', dateToUse)
    .in('station_id', stationIds);

  if (joined.error) {
    console.warn('[api] nutrient join unavailable, using flat columns:', joined.error.message);
    items = unwrap(
      await supabase
        .from('menu_items')
        .select('id, name, calories, portion, is_vegetarian, is_vegan, is_high_protein, station_id')
        .eq('date', dateToUse)
        .in('station_id', stationIds),
      'fetching menu items'
    );
  } else {
    items = joined.data;
  }

  const stationNames = Object.fromEntries(stations.map(s => [s.id, s.name]));

  const formatted = (items ?? []).map(item => {
    const nutrients = item.nutrients ?? [];
    const find = keyword => {
      const match = nutrients.find(n => n.name?.toLowerCase().includes(keyword));
      return match ? `${match.value}${match.uom ? ` ${match.uom}` : ''}`.trim() : null;
    };
    return {
      id: item.id,
      name: item.name,
      calories: item.calories ?? null,
      portion: item.portion ?? null,
      station: stationNames[item.station_id] ?? null,
      isVegetarian: item.is_vegetarian ?? false,
      isVegan: item.is_vegan ?? false,
      isHighProtein: item.is_high_protein ?? false,
      protein: find('protein'),
      fat: find('total fat'),
      carbs: find('total carbohydrate'),
      fiber: find('dietary fiber'),
      sodium: find('sodium'),
      sugar: find('total sugar'),
      description: null,
    };
  });

  res.status(200).json({
    location: location.name,
    period: period.name,
    date: dateToUse,
    ageDays: age,
    items: formatted,
    totalItems: formatted.length,
  });
}

export default withErrorHandling(handler);
