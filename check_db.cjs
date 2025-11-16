require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkData() {
    const { data: locations, error } = await supabase
        .from('locations')
        .select('*')
        .order('date', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Locations:');
    locations.forEach(loc => {
        console.log(`${loc.date}: ${loc.name} (id: ${loc.id})`);
    });

    if (locations.length > 0) {
        const latestDate = locations[0].date;
        const { data: periods, error: periodError } = await supabase
            .from('periods')
            .select('*')
            .eq('date', latestDate)
            .limit(10);

        if (periodError) {
            console.error('Period error:', periodError);
        } else {
            console.log(`\nPeriods for ${latestDate}:`);
            periods.forEach(p => {
                console.log(`- ${p.name} (id: ${p.id}, location_id: ${p.location_id})`);
            });

            if (periods.length > 0) {
                const { data: stations, error: stationError } = await supabase
                    .from('stations')
                    .select('*')
                    .eq('period_id', periods[0].id)
                    .limit(5);

                if (stationError) {
                    console.error('Station error:', stationError);
                } else {
                    console.log(`\nStations for period ${periods[0].name}:`);
                    stations.forEach(s => {
                        console.log(`- ${s.name} (id: ${s.id})`);
                    });
                }
            }
        }

        const { data: items, error: itemError } = await supabase
            .from('menu_items')
            .select('*')
            .eq('date', latestDate)
            .limit(5);

        if (itemError) {
            console.error('Item error:', itemError);
        } else {
            console.log(`\nMenu items for ${latestDate}:`);
            items.forEach(item => {
                console.log(`- ${item.name}`);
            });
        }
    }
}

checkData();