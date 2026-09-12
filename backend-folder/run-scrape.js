/**
 * Populate today's menu data and the weekly opening hours.
 *
 *   cd backend-folder
 *   node run-scrape.js
 *
 * DineOnCampus sits behind Cloudflare, which blocks datacenter traffic, so
 * this has to run from a residential IP (your machine, not GitHub Actions or
 * a cloud VM). That is also why it drives a real Chrome through Puppeteer
 * rather than calling fetch directly.
 */
require('dotenv').config();
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend-folder/.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SITE_ID = '5751fd2b90975b60e048929a';

const LOCATIONS = [
  { id: '586d05e4ee596f6e6c04b527', name: 'The Eatery at Stetson East' },
  { id: '5f4f8a425e42ad17329be131', name: 'United Table at International Village' },
  { id: '686d10a81fea2d6aaeb9f733', name: 'Campus Roots at 60 Belvidere' },
];

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
].filter(Boolean);

/** First browser that actually exists, so a missing one fails with advice. */
function resolveChrome() {
  const found = CHROME_CANDIDATES.find(p => fs.existsSync(p));
  if (!found) {
    throw new Error(
      `No Chrome build found. Looked in:\n  ${CHROME_CANDIDATES.join('\n  ')}\n`
      + 'Install Chrome or set CHROME_PATH to its executable.'
    );
  }
  return found;
}

/**
 * Cloudflare is markedly harder to get past in headless mode, so a real
 * visible window is the default. That means a scheduled run needs a
 * logged-in desktop session: a plain headless cron will not work. Set
 * SCRAPE_HEADLESS=true to try anyway.
 */
const HEADLESS = process.env.SCRAPE_HEADLESS === 'true';

// Collected so the process can exit non-zero and a cron log shows the reason.
const failures = [];

const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

let browser, page;

async function fetchJson(url) {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 2000));
  const text = await page.evaluate(() => {
    // Chrome wraps JSON in a <pre> tag when rendering it
    const pre = document.querySelector('pre');
    return (pre ? pre.textContent : document.body.innerText).trim();
  });
  if (!text) throw new Error('Empty response body');
  return JSON.parse(text);
}

/* Opening hours ------------------------------------------------------------ */

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function pad(n) {
  return String(n).padStart(2, '0');
}

/**
 * Resolve the day index for one entry of a weekly_schedule "week" array.
 * The field is normally a number where 0 is Sunday, but fall back to the
 * position in the array if it is missing or shaped differently.
 */
function dayIndexOf(entry, position) {
  if (typeof entry.day === 'number') return entry.day % 7;
  if (typeof entry.day === 'string') {
    const found = DAY_NAMES.indexOf(entry.day.trim().toLowerCase());
    if (found !== -1) return found;
  }
  return position % 7;
}

/** Turn one weekly_schedule location into hall_hours rows. */
function hourRowsFor(locationName, weekEntries) {
  const rows = [];

  weekEntries.forEach((entry, position) => {
    const day = dayIndexOf(entry, position);
    const windows = Array.isArray(entry.hours) ? entry.hours : [];
    const markedClosed = entry.closed === true || entry.status === 'closed';

    if (markedClosed || windows.length === 0) {
      rows.push({
        location_name: locationName,
        day_of_week: day,
        slot_index: 0,
        opens_at: null,
        closes_at: null,
        closed: true,
      });
      return;
    }

    windows.forEach((window, slotIndex) => {
      const startHour = Number(window.start_hour);
      const endHour = Number(window.end_hour);
      if (!Number.isFinite(startHour) || !Number.isFinite(endHour)) return;

      rows.push({
        location_name: locationName,
        day_of_week: day,
        slot_index: slotIndex,
        opens_at: `${pad(startHour)}:${pad(Number(window.start_minutes) || 0)}:00`,
        closes_at: `${pad(endHour)}:${pad(Number(window.end_minutes) || 0)}:00`,
        closed: false,
      });
    });
  });

  return rows;
}

async function scrapeHours() {
  console.log('\nOpening hours');

  let payload;
  try {
    payload = await fetchJson(
      `https://api.dineoncampus.com/v1/locations/weekly_schedule?site_id=${SITE_ID}&date=${today}`
    );
  } catch (e) {
    console.error(`  weekly_schedule fetch error: ${e.message}`);
    failures.push(`hours: ${e.message}`);
    return;
  }

  const remoteLocations = payload.the_locations || payload.locations || [];
  if (!remoteLocations.length) {
    console.error('  weekly_schedule returned no locations. Raw keys:', Object.keys(payload).join(', '));
    failures.push('hours: weekly_schedule returned no locations');
    return;
  }

  for (const loc of LOCATIONS) {
    const match = remoteLocations.find(
      r => r._id === loc.id || r.id === loc.id || r.name === loc.name
    );
    if (!match) {
      // A hardcoded location id that no longer matches is a silent-rot risk,
      // so treat it as a failure rather than a warning.
      console.warn(`  ${loc.name}: not present in weekly_schedule, leaving stored hours untouched`);
      failures.push(`hours: ${loc.name} not found upstream (id ${loc.id} may be stale)`);
      continue;
    }

    const rows = hourRowsFor(loc.name, Array.isArray(match.week) ? match.week : []);
    if (!rows.length) {
      console.warn(`  ${loc.name}: no parsable hours, leaving stored hours untouched`);
      failures.push(`hours: ${loc.name} returned no parsable windows`);
      continue;
    }

    // Replace the whole week so a hall that drops a service window does not
    // keep the stale slot around.
    const { error: delErr } = await supabase
      .from('hall_hours').delete().eq('location_name', loc.name);
    if (delErr) { console.error(`  ${loc.name}: clear error: ${delErr.message}`); continue; }

    const { error: insErr } = await supabase.from('hall_hours').insert(rows);
    if (insErr) { console.error(`  ${loc.name}: insert error: ${insErr.message}`); continue; }

    const openDays = rows.filter(r => !r.closed).length;
    console.log(`  ${loc.name}: ${rows.length} rows (${openDays} service windows)`);
  }
}

/* Menus -------------------------------------------------------------------- */

async function scrapeMenus() {
  const { data: existing } = await supabase
    .from('menu_items').select('id').eq('date', today).limit(1);
  if (existing && existing.length > 0) {
    console.log(`\nMenu data already exists for ${today}. Nothing to do.`);
    return;
  }

  let totalItems = 0;

  for (const loc of LOCATIONS) {
    console.log(`\n${loc.name}`);

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
      if (period.name === 'Everyday') continue;

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
              station_id:      dbStation.id,
              original_id:     item.id || null,
              name:            item.name,
              calories:        item.calories ?? null,
              portion:         item.portion ?? null,
              date:            today,
              is_vegetarian:   isVegetarian,
              is_vegan:        isVegan,
              is_high_protein: isHighProtein,
            })
            .select().single();
          if (itemErr) { console.error(`  item insert error (${item.name}): ${itemErr.message}`); continue; }

          if (item.nutrients?.length) {
            await supabase.from('nutrients').insert(
              item.nutrients.map(n => ({
                menu_item_id:  dbItem.id,
                name:          n.name,
                value:         n.value,
                uom:           n.uom,
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

  await supabase.from('steast_vs_iv')
    .upsert({ date: today, steast: 0, iv: 0 }, { onConflict: 'date', ignoreDuplicates: true });

  if (totalItems === 0) {
    failures.push(`menus: nothing was inserted for ${today}`);
  }
  console.log(`\nInserted ${totalItems} menu items for ${today}.`);
}

async function main() {
  console.log(`Scraping DineOnCampus for ${today}`);

  const chromePath = resolveChrome();
  console.log(`Using ${chromePath}${HEADLESS ? ' (headless)' : ''}`);

  browser = await puppeteer.launch({
    headless: HEADLESS,
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // Hours change less often than menus but are cheap to refresh, so they run
  // on every invocation even when today's menu is already stored.
  await scrapeHours();
  await scrapeMenus();
}

main()
  .catch(err => {
    console.error('Fatal:', err.message);
    failures.push(`fatal: ${err.message}`);
  })
  .finally(async () => {
    await browser?.close();
    if (failures.length) {
      console.error(`\n${failures.length} problem(s):`);
      for (const f of failures) console.error(`  - ${f}`);
      process.exitCode = 1;
    } else {
      console.log('\nAll done, no problems.');
    }
  });
