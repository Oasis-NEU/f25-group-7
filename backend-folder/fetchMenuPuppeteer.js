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
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Set a real user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');

    // Navigate to the API endpoint
    await page.goto('https://apiv4.dineoncampus.com/sites/todays_menu?siteId=5751fd2b90975b60e048929a', {
        waitUntil: 'networkidle0'
    });

    // Extract the JSON data from the page
    const data = await page.evaluate(() => {
        return JSON.parse(document.body.innerText);
    });

    await browser.close();

    console.log(`✅ Found ${data.locations.length} locations`);
    return data;
}

async function storeMenuData(data) {
    // OLD (UTC time):
    // const today = new Date().toISOString().split('T')[0];

    // NEW (EST time):
    const today = new Date().toLocaleDateString('en-CA', {
        timeZone: 'America/New_York'
    });

    console.log(`📅 Storing data for date: ${today}`);

    // ... rest of the code stays the same

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

        const { error: locError } = await supabase
            .from('locations')
            .upsert({
                id: location.id,
                name: location.name,
                type: location.type,
                building_name: location.building_name,
                sort_order: location.sort_order
            });

        if (locError) {
            console.error(`Error storing location: ${locError.message}`);
            continue;
        }

        for (const period of location.periods) {
            const { error: periodError } = await supabase
                .from('periods')
                .upsert({
                    id: period.id,
                    location_id: location.id,
                    name: period.name
                });

            if (periodError) {
                console.error(`Error storing period: ${periodError.message}`);
                continue;
            }

            for (const station of period.stations) {
                const { error: stationError } = await supabase
                    .from('stations')
                    .upsert({
                        id: station.id,
                        period_id: period.id,
                        name: station.name
                    });

                if (stationError) {
                    console.error(`Error storing station: ${stationError.message}`);
                    continue;
                }

                const items = station.items.map(item => ({
                    station_id: station.id,
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
                        console.log(`Added ${items.length} items from ${station.name}`);
                    }
                }
            }
        }
    }

    console.log(`\nSuccessfully stored ${totalItems} menu items!`);
}

async function main() {
    console.log('Starting Northeastern Dining Menu Scraper\n');

    try {
        const menuData = await fetchMenuData();
        await storeMenuData(menuData);
        console.log('\nAll done!');
    } catch (error) {
        console.error('\nError:', error.message);
        process.exit(1);
    }
}

main();