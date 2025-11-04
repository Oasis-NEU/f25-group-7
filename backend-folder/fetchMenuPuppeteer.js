require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const puppeteer = require('puppeteer');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

async function fetchMenuData() {
    console.log('Launching browser to fetch menu data...');

    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu'
        ]
    });

    const page = await browser.newPage();

    // Set a real user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');

    console.log('Navigating to API...');

    // Navigate to the API endpoint
    const response = await page.goto('https://apiv4.dineoncampus.com/sites/todays_menu?siteId=5751fd2b90975b60e048929a', {
        waitUntil: 'networkidle0',
        timeout: 30000
    });

    console.log('Response status:', response.status());
    console.log('Content-Type:', response.headers()['content-type']);

    // Get the body text to see what we're actually receiving
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('First 500 characters of response:');
    console.log(bodyText.substring(0, 500));
    console.log('---END OF PREVIEW---');

    let data;
    try {
        data = JSON.parse(bodyText);
    } catch (parseError) {
        console.error('JSON Parse Error:', parseError.message);
        console.error('Full response (first 1000 chars):', bodyText.substring(0, 1000));
        await browser.close();
        throw new Error('Failed to parse JSON response from API');
    }

    await browser.close();

    console.log(`✅ Found ${data.locations.length} locations`);
    return data;
}

async function storeMenuData(data) {
    // Get EST date
    const today = new Date().toLocaleDateString('en-CA', {
        timeZone: 'America/New_York'
    });

    console.log(`📅 Storing data for date: ${today}`);

    // Check if menu already exists for today
    const { data: existingItems } = await supabase
        .from('menu_items')
        .select('id')
        .eq('date', today)
        .limit(1);

    if (existingItems && existingItems.length > 0) {
        console.log('Menu already exists for today. Skipping...');
        return;
    }

    let totalItems = 0;

    for (const location of data.locations) {
        console.log(`\n Processing: ${location.name}`);

        // Insert location with date (creates new entry each day)
        const { data: insertedLocation, error: locError } = await supabase
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
            console.error(`Error storing location: ${locError.message}`);
            continue;
        }

        const locationDbId = insertedLocation.id;

        for (const period of location.periods) {
            // Insert period with date (creates new entry each day)
            const { data: insertedPeriod, error: periodError } = await supabase
                .from('periods')
                .insert({
                    original_id: period.id,
                    location_id: locationDbId,
                    name: period.name,
                    date: today
                })
                .select()
                .single();

            if (periodError) {
                console.error(`Error storing period: ${periodError.message}`);
                continue;
            }

            const periodDbId = insertedPeriod.id;

            for (const station of period.stations) {
                // Insert station with date (creates new entry each day)
                const { data: insertedStation, error: stationError } = await supabase
                    .from('stations')
                    .insert({
                        original_id: station.id,
                        period_id: periodDbId,
                        name: station.name,
                        date: today
                    })
                    .select()
                    .single();

                if (stationError) {
                    console.error(`Error storing station: ${stationError.message}`);
                    continue;
                }

                const stationDbId = insertedStation.id;

                const items = station.items.map(item => ({
                    station_id: stationDbId,
                    name: item.name,
                    calories: item.calories,
                    portion: item.portion,
                    date: today
                }));

                if (items.length > 0) {
                    const { error: itemsError } = await supabase
                        .from('menu_items')
                        .insert(items);

                    if (itemsError) {
                        console.error(`Error storing items: ${itemsError.message}`);
                    } else {
                        totalItems += items.length;
                        console.log(`✅ Added ${items.length} items from ${station.name}`);
                    }
                }
            }
        }
    }

    console.log(`\n🎉 Successfully stored ${totalItems} menu items!`);
}

async function main() {
    console.log('Starting Northeastern Dining Menu Scraper\n');

    try {
        const menuData = await fetchMenuData();
        await storeMenuData(menuData);
        console.log('\n✅ All done!');
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

main();