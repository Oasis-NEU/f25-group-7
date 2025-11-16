// Simple node script to reproduce the front-end Supabase queries
// Usage: `node front-end/scripts/check_menu.js [hall] [meal]`
import fs from 'fs';
import path from 'path';
import url from 'url';
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

async function main() {
  try {
    const envPath = path.resolve(__dirname, '..', '.env');
    const env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    const parsed = {};
    env.split(/\n/).forEach(line => {
      const m = line.match(/^(\w+)=(?:"([^"]*)"|'([^']*)'|(.*))$/);
      if (m) parsed[m[1]] = m[2] || m[3] || m[4] || '';
    });

    const supabaseUrl = parsed.VITE_SUPABASE_URL;
    const supabaseKey = parsed.VITE_SUPABASE_ANON_KEY || parsed.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing supabase env in front-end/.env');
      process.exit(1);
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const hall = process.argv[2] || 'stetson-east';
    const meal = process.argv[3] || 'breakfast';

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
    let dateToUse = today;
    console.log('today:', today);

    // locations for today
    let { data: locations } = await supabase.from('locations').select('*').eq('date', today);
    if (!locations || locations.length === 0) {
      const { data: latestLocations } = await supabase.from('locations').select('*').order('date', { ascending: false }).limit(10);
      locations = latestLocations;
      if (locations && locations.length > 0) dateToUse = locations[0].date;
    }
    console.log('using dateToUse:', dateToUse);
    if (!locations || locations.length === 0) {
      console.log('no locations found');
      return;
    }

    const normalize = (s) => String(s || '').toLowerCase().replace(/\s+/g, '-');
    const targetLocation = locations.find(l => {
      const n = normalize(l.name);
      return n === hall || n.includes(hall) || hall.includes(n) || l.name.toLowerCase().includes(hall.replace('-', ' '));
    });
    console.log('targetLocation:', targetLocation && targetLocation.name);
    if (!targetLocation) return;

    let { data: periods } = await supabase.from('periods').select('*').eq('location_id', targetLocation.id).eq('date', dateToUse);
    if (!periods || periods.length === 0) {
      const { data: latestPeriods } = await supabase.from('periods').select('*').eq('location_id', targetLocation.id).order('date', { ascending: false }).limit(50);
      periods = latestPeriods;
      if (periods && periods.length > 0) dateToUse = periods[0].date;
    }
    const targetPeriod = (periods || []).find(p => p.name.toLowerCase().includes(meal.toLowerCase()));
    console.log('targetPeriod:', targetPeriod && targetPeriod.name);
    if (!targetPeriod) return;

    let { data: stationsRows } = await supabase.from('stations').select('*').eq('period_id', targetPeriod.id).eq('date', dateToUse);
    if (!stationsRows || stationsRows.length === 0) {
      const { data: latestStations } = await supabase.from('stations').select('*').eq('period_id', targetPeriod.id).order('date', { ascending: false }).limit(200);
      stationsRows = latestStations;
    }
    console.log('stations count:', (stationsRows || []).length);
    const stationIds = (stationsRows || []).map(s => s.id);
    if (stationIds.length === 0) return;

    let { data: items } = await supabase.from('menu_items').select('*').in('station_id', stationIds).eq('date', dateToUse);
    if (!items || items.length === 0) {
      const { data: fallbackItems } = await supabase.from('menu_items').select('*').in('station_id', stationIds).order('date', { ascending: false }).limit(500);
      items = fallbackItems;
    }
    console.log('items count:', (items || []).length);
    (items || []).slice(0,50).forEach(i => console.log('-', i.id, i.name || i.title || ''));
  } catch (err) {
    console.error('error:', err.message || err);
    process.exit(1);
  }
}

main();
// Simple node script to reproduce the front-end Supabase queries
// Usage: `node front-end/scripts/check_menu.js [hall] [meal]`
import fs from 'fs';
import path from 'path';
(async () => {
	try {
		const envPath = path.resolve(__dirname, '..', '.env');
		const env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
		const parsed = {};
		env.split(/\n/).forEach(line => {
			const m = line.match(/^(\w+)=(?:"([^"]*)"|'([^']*)'|(.*))$/);
			if (m) parsed[m[1]] = m[2] || m[3] || m[4] || '';
		}
	} catch (err) {
		console.error('error:', err.message || err);
		process.exit(1);
	}
})();
		const { createClient } = await import('@supabase/supabase-js');
		const supabase = createClient(supabaseUrl, supabaseKey);

		const hall = process.argv[2] || 'stetson-east';
		const meal = process.argv[3] || 'breakfast';

		const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
		let dateToUse = today;
		console.log('today:', today);

		// locations for today
		let { data: locations } = await supabase.from('locations').select('*').eq('date', today);
		if (!locations || locations.length === 0) {
			const { data: latestLocations } = await supabase.from('locations').select('*').order('date', { ascending: false }).limit(10);
			locations = latestLocations;
			if (locations && locations.length > 0) dateToUse = locations[0].date;
		}
		console.log('using dateToUse:', dateToUse);
		if (!locations || locations.length === 0) {
			console.log('no locations found');
			process.exit(0);
		}

		const normalize = (s) => String(s || '').toLowerCase().replace(/\s+/g, '-');
		const targetLocation = locations.find(l => {
			const n = normalize(l.name);
			return n === hall || n.includes(hall) || hall.includes(n) || l.name.toLowerCase().includes(hall.replace('-', ' '));
		});
		console.log('targetLocation:', targetLocation && targetLocation.name);
		if (!targetLocation) process.exit(0);

		let { data: periods } = await supabase.from('periods').select('*').eq('location_id', targetLocation.id).eq('date', dateToUse);
		if (!periods || periods.length === 0) {
			const { data: latestPeriods } = await supabase.from('periods').select('*').eq('location_id', targetLocation.id).order('date', { ascending: false }).limit(50);
			periods = latestPeriods;
			if (periods && periods.length > 0) dateToUse = periods[0].date;
		}
		const targetPeriod = (periods || []).find(p => p.name.toLowerCase().includes(meal.toLowerCase()));
		console.log('targetPeriod:', targetPeriod && targetPeriod.name);
		if (!targetPeriod) process.exit(0);

		let { data: stationsRows } = await supabase.from('stations').select('*').eq('period_id', targetPeriod.id).eq('date', dateToUse);
		if (!stationsRows || stationsRows.length === 0) {
			const { data: latestStations } = await supabase.from('stations').select('*').eq('period_id', targetPeriod.id).order('date', { ascending: false }).limit(200);
			stationsRows = latestStations;
		}
		console.log('stations count:', (stationsRows || []).length);
		const stationIds = (stationsRows || []).map(s => s.id);
		if (stationIds.length === 0) process.exit(0);

		let { data: items } = await supabase.from('menu_items').select('*').in('station_id', stationIds).eq('date', dateToUse);
		if (!items || items.length === 0) {
			const { data: fallbackItems } = await supabase.from('menu_items').select('*').in('station_id', stationIds).order('date', { ascending: false }).limit(500);
			items = fallbackItems;
		}
		console.log('items count:', (items || []).length);
		(items || []).slice(0,50).forEach(i => console.log('-', i.id, i.name || i.title || ''));
	} catch (err) {
		console.error('error:', err.message || err);
		process.exit(1);
	}
)();
++ })();