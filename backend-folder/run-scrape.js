/**
 * Populate today's menu data.
 *
 *   cd backend-folder
 *   node run-scrape.js
 *
 * DineOnCampus is behind Cloudflare so we use Puppeteer + Chrome.
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const puppeteer = require('puppeteer-core');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend-folder/.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Hardcoded location IDs — these are the 3 main NU dining halls
const LOCATIONS = [
  { id: '586d05e4ee596f6e6c04b527', name: 'The Eatery at Stetson East' },
  { id: '5f4f8a425e42ad17329be131', name: 'United Table at International Village' },
  { id: '686d10a81fea2d6aaeb9f733', name: 'Campus Roots at 60 Belvidere' },
];

// Auto-detect Chrome: env override → macOS default → Linux CI path
const CHROME_PATH = process.env.CHROME_PATH
  || (process.platform === 'darwin'
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : '/usr/bin/google-chrome-stable');

const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
console.log(`Scraping menu data for ${today}...\n`);

let browser, page;

async function fetchJson(url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const text = await page.evaluate(() => document.body.innerText);
  return JSON.parse(text);
}

async function main() {
  // Skip if already populated
  const { data: existing } = await supabase
    .from('menu_items').select('id').eq('date', today).limit(1);
  if (existing && existing.length > 0) {
    console.log(`Menu data already exists for ${today}. Nothing to do.`);
    return;
  }

  browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  );

  let totalItems = 0;

  for (const loc of LOCATIONS) {
    console.log(`\n→ ${loc.name}`);

    // Insert location row (or reuse existing one if this is a retry)
    let dbLoc;
    const { data: existingLoc } = await supabase
      .from('locations').select('id').eq('original_id', loc.id).eq('date', today).maybeSingle();
    if (existingLoc) {
      dbLoc = existingLoc;
    } else {
      const { data: newLoc, error: locErr } = await supabase
        .from('locations')
        .insert({ original_id: loc.id, name: loc.name, date: today })
        .select().single();
      if (locErr) { console.error(`  location insert error: ${locErr.message}`); continue; }
      dbLoc = newLoc;
    }

    // Get periods for this location
    let periodsData;
    try {
      periodsData = await fetchJson(
        `https://apiv4.dineoncampus.com/locations/${loc.id}/periods?date=${today}`
      );
    } catch (e) { console.error(`  periods fetch error: ${e.message}`); continue; }

    const periods = periodsData.periods || [];
    if (!periods.length) { console.log('  No periods found.'); continue; }
    console.log(`  Periods: ${periods.map(p => p.name).join(', ')}`);

    for (const period of periods) {
      if (period.name === 'Everyday') continue; // skip non-meal period

      let dbPeriod;
      const { data: existingPeriod } = await supabase
        .from('periods').select('id').eq('original_id', period.id).eq('location_id', dbLoc.id).eq('date', today).maybeSingle();
      if (existingPeriod) {
        dbPeriod = existingPeriod;
      } else {
        const { data: newPeriod, error: perErr } = await supabase
          .from('periods')
          .insert({ original_id: period.id, location_id: dbLoc.id, name: period.name, date: today })
          .select().single();
        if (perErr) { console.error(`  period insert error: ${perErr.message}`); continue; }
        dbPeriod = newPeriod;
      }

      // Get full menu for this period
      let menuData;
      try {
        menuData = await fetchJson(
          `https://apiv4.dineoncampus.com/locations/${loc.id}/menu?date=${today}&period=${period.id}`
        );
      } catch (e) { console.warn(`  menu fetch error for ${period.name}: ${e.message}`); continue; }

      const categories = menuData.period?.categories || [];
      if (!categories.length) { console.log(`  ${period.name}: no categories`); continue; }

      for (const cat of categories) {
        let dbStation;
        const { data: existingStation } = await supabase
          .from('stations').select('id').eq('period_id', dbPeriod.id).eq('name', cat.name).eq('date', today).maybeSingle();
        if (existingStation) {
          dbStation = existingStation;
        } else {
          const { data: newStation, error: stErr } = await supabase
            .from('stations')
            .insert({ original_id: cat.id || null, period_id: dbPeriod.id, name: cat.name, date: today })
            .select().single();
          if (stErr) { console.error(`  station insert error: ${stErr.message}`); continue; }
          dbStation = newStation;
        }

        for (const item of (cat.items || [])) {
          const filters = (item.filters || []).map(f => (typeof f === 'string' ? f : f.name));
          const isVegan       = filters.includes('Vegan');
          const isVegetarian  = filters.includes('Vegetarian') || isVegan;
          const isHighProtein = filters.includes('Good Source of Protein');

          const { data: dbItem, error: itemErr } = await supabase
            .from('menu_items')
            .insert({
              station_id:     dbStation.id,
              original_id:    item.id || null,
              name:           item.name,
              calories:       item.calories ?? null,
              portion:        item.portion ?? null,
              date:           today,
              is_vegetarian:  isVegetarian,
              is_vegan:       isVegan,
              is_high_protein: isHighProtein,
            })
            .select().single();
          if (itemErr) { console.error(`  item insert error (${item.name}): ${itemErr.message}`); continue; }

          // Store nutrients
          if (item.nutrients?.length) {
            await supabase.from('nutrients').insert(
              item.nutrients.map(n => ({
                menu_item_id: dbItem.id,
                name:         n.name,
                value:        n.value,
                uom:          n.uom,
                value_numeric: parseFloat(n.valueNumeric) || null,
              }))
            );
          }
          totalItems++;
        }
        console.log(`  ${period.name} / ${cat.name}: ${cat.items?.length || 0} items`);
      }
    }
  }

  // Ensure today's vote row exists
  await supabase.from('steast_vs_iv')
    .upsert({ date: today, steast: 0, iv: 0 }, { onConflict: 'date', ignoreDuplicates: true });

  console.log(`\nDone! Inserted ${totalItems} menu items for ${today}.`);
}

main()
  .catch(err => { console.error('Fatal:', err.message); process.exit(1); })
  .finally(() => browser?.close());
