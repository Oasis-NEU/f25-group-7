import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Launching browser...')
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    console.log('Fetching menu data...')
    await page.goto('https://apiv4.dineoncampus.com/sites/todays_menu?siteId=5751fd2b90975b60e048929a', {
      waitUntil: 'networkidle2'
    });

    const bodyText = await page.evaluate(() => document.body.innerText);
    const data = JSON.parse(bodyText);
    
    await browser.close();

    console.log(`Found ${data.locations.length} locations`)

    // Get today's date in EST
    const today = new Date().toLocaleDateString('en-CA', {
      timeZone: 'America/New_York'
    });

    console.log(`Storing data for ${today}`)

    // Check if menu already exists
    const { data: existingItems } = await supabaseClient
      .from('menu_items')
      .select('id')
      .eq('date', today)
      .limit(1);

    if (existingItems && existingItems.length > 0) {
      return new Response(
        JSON.stringify({ message: 'Menu already exists for today' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let totalItems = 0;

    for (const location of data.locations) {
      console.log(`Processing: ${location.name}`)

      const { data: insertedLocation, error: locError } = await supabaseClient
        .from('locations')
        .insert({
          original_id: location.id,
          name: location.name,
          type: location.type,
          building_name: location.building_name,
          sort_order: location.sort_order,
          date: today
        })
        .select()
        .single();

      if (locError) {
        console.error(`Error storing location: ${locError.message}`)
        continue;
      }

      for (const period of location.periods) {
        const { data: insertedPeriod, error: periodError } = await supabaseClient
          .from('periods')
          .insert({
            original_id: period.id,
            location_id: insertedLocation.id,
            name: period.name,
            date: today
          })
          .select()
          .single();

        if (periodError) {
          console.error(`Error storing period: ${periodError.message}`)
          continue;
        }

        for (const station of period.stations) {
          const { data: insertedStation, error: stationError } = await supabaseClient
            .from('stations')
            .insert({
              original_id: station.id,
              period_id: insertedPeriod.id,
              name: station.name,
              date: today
            })
            .select()
            .single();

          if (stationError) {
            console.error(`Error storing station: ${stationError.message}`)
            continue;
          }

          const items = station.items.map((item: any) => ({
            station_id: insertedStation.id,
            name: item.name,
            calories: item.calories,
            portion: item.portion,
            date: today
          }));

          if (items.length > 0) {
            const { error: itemsError } = await supabaseClient
              .from('menu_items')
              .insert(items);

            if (itemsError) {
              console.error(`Error storing items: ${itemsError.message}`)
            } else {
              totalItems += items.length;
              console.log(`Added ${items.length} items`)
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully stored ${totalItems} menu items`,
        date: today
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})