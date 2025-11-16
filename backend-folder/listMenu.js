require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Accept same fallbacks as fetchMenuPuppeteer
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

(async () => {
  try {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
    console.log('Querying rows for date:', today);

    const { data: locations, error: locErr } = await supabase.from('locations').select('*').eq('date', today);
    if (locErr) throw locErr;
    console.log('\nLocations:');
    console.dir(locations, { depth: 2 });

    const { data: periods, error: perErr } = await supabase.from('periods').select('*').eq('date', today);
    if (perErr) throw perErr;
    console.log('\nPeriods:');
    console.dir(periods, { depth: 2 });

    const { data: stations, error: stErr } = await supabase.from('stations').select('*').eq('date', today);
    if (stErr) throw stErr;
    console.log('\nStations:');
    console.dir(stations, { depth: 2 });

    const { data: items, error: itErr } = await supabase.from('menu_items').select('*').eq('date', today).limit(50);
    if (itErr) throw itErr;
    console.log('\nMenu items (first 50):');
    console.dir(items, { depth: 2 });

    const itemIds = (items || []).map(i => i.id);
    if (itemIds.length > 0) {
      const { data: nutrients } = await supabase.from('nutrients').select('*').in('menu_item_id', itemIds);
      console.log('\nNutrients (for returned items):');
      console.dir(nutrients, { depth: 2 });
    }

    console.log('\nDone.');
  } catch (err) {
    console.error('Error querying Supabase:', err.message || err);
    process.exit(1);
  }
})();