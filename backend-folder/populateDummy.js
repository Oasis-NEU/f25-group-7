require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function populateDummyData() {
  const today = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/New_York'
  });

  console.log(`Populating dummy data for ${today}`);

  // Insert location
  const { data: location, error: locError } = await supabase
    .from('locations')
    .insert({
      original_id: 'dummy1',
      name: 'Stetson East',
      type: 'dining',
      building_name: 'Stetson East',
      sort_order: 1,
      date: today
    })
    .select()
    .single();

  if (locError) {
    console.error('Error inserting location:', locError);
    return;
  }

  console.log('Inserted location:', location.name);

  // Insert period
  const { data: period, error: periodError } = await supabase
    .from('periods')
    .insert({
      location_id: location.id,
      original_id: 'dummy_period1',
      name: 'Breakfast',
      date: today
    })
    .select()
    .single();

  if (periodError) {
    console.error('Error inserting period:', periodError);
    return;
  }

  console.log('Inserted period:', period.name);

  // Insert station
  const { data: station, error: stationError } = await supabase
    .from('stations')
    .insert({
      period_id: period.id,
      original_id: 'dummy_station1',
      name: 'Cucina',
      date: today
    })
    .select()
    .single();

  if (stationError) {
    console.error('Error inserting station:', stationError);
    return;
  }

  console.log('Inserted station:', station.name);

  // Insert menu items
  const items = [
    { name: 'Scrambled Eggs' },
    { name: 'Pancakes' },
    { name: 'Bacon' }
  ];

  for (const item of items) {
    const { error: itemError } = await supabase
      .from('menu_items')
      .insert({
        station_id: station.id,
        original_id: `dummy_item_${item.name.replace(' ', '_')}`,
        name: item.name,
        date: today
      });

    if (itemError) {
      console.error('Error inserting item:', itemError);
    } else {
      console.log('Inserted item:', item.name);
    }
  }

  console.log('Dummy data populated successfully!');
}

populateDummyData().catch(console.error);