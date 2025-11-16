require('dotenv').config();
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? 'Found' : 'Missing');
const { createClient } = require('@supabase/supabase-js');
const puppeteer = require('puppeteer');

// Support both direct SUPABASE_* env vars and Vite-prefixed VITE_* vars
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL?.replace(/^"|"$/g, '');
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.replace(/^"|"$/g, '');

console.log('SUPABASE_URL:', SUPABASE_URL ? 'Found' : 'Missing');
console.log('SUPABASE_KEY:', SUPABASE_KEY ? 'Found' : 'Missing');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_KEY, or VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    process.exit(1);
}

async function fetchMenuData() {
    console.log('Launching browser to fetch menu data...');

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');

    // Fetch main menu data
    await page.goto('https://apiv4.dineoncampus.com/sites/todays_menu?siteId=5751fd2b90975b60e048929a', {
        waitUntil: 'networkidle0'
    });

    const data = await page.evaluate(() => {
        return JSON.parse(document.body.innerText);
    });

    console.log(`Found ${data.locations.length} locations`);
    
    await browser.close();
    return data;
}

async function fetchDetailedMenuData(locationId, date, periodId) {
    console.log(`  Fetching detailed data for period ${periodId}...`);
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');

    const url = `https://apiv4.dineoncampus.com/locations/${locationId}/menu?date=${date}&period=${periodId}`;
    
    await page.goto(url, { waitUntil: 'networkidle0' });
    
    const detailedData = await page.evaluate(() => {
        return JSON.parse(document.body.innerText);
    });

    await browser.close();
    return detailedData;
}

async function storeMenuData(data) {
    const today = new Date().toLocaleDateString('en-CA', {
        timeZone: 'America/New_York'
    });

    console.log(`Storing data for date: ${today}`);

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
        console.log(`\nProcessing: ${location.name}`);

        // Insert location
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
            // Insert period
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

            // Fetch detailed menu data for this period
            let detailedData;
            try {
                detailedData = await fetchDetailedMenuData(location.id, today, period.id);
                console.log(`  Successfully fetched detailed data for ${period.name}`);
            } catch (error) {
                console.error(`Error fetching detailed data: ${error.message}`);
                continue;
            }

            // Create a map of item names to detailed item data
            const itemDetailsMap = new Map();
            if (detailedData.period && detailedData.period.categories) {
                for (const category of detailedData.period.categories) {
                    for (const item of category.items) {
                        // Use name as the key since basic items don't have IDs
                        itemDetailsMap.set(item.name, item);
                    }
                }
                console.log(`  Mapped ${itemDetailsMap.size} items with detailed data`);
            } else {
                console.log(`  Warning: No categories found in detailed data`);
            }

            for (const station of period.stations) {
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

                // Store items with detailed data
                for (const item of station.items) {
                    // Match by name instead of ID
                    const detailedItem = itemDetailsMap.get(item.name);
                    
                    if (!detailedItem) {
                        console.log(` No detailed data found for item: ${item.name}`);
                    }
                    
                    // Check if vegetarian, vegan, or high protein
                    // If vegan, automatically mark as vegetarian too
                    let isVegetarian = false;
                    let isVegan = false;
                    let isHighProtein = false;
                    if (detailedItem?.filters) {
                        isVegan = detailedItem.filters.some(f => f.name === 'Vegan');
                        isVegetarian = detailedItem.filters.some(f => f.name === 'Vegetarian' || f.name === 'Vegan');
                        isHighProtein = detailedItem.filters.some(f => f.name === 'Good Source of Protein');
                        
                        // Debug logging for first few items
                        if (totalItems < 5) {
                            console.log(`  Item: ${item.name}`);
                            console.log(`    Filters: ${detailedItem.filters.map(f => f.name).join(', ')}`);
                            console.log(`    isVegan: ${isVegan}, isVegetarian: ${isVegetarian}, isHighProtein: ${isHighProtein}`);
                        }
                    }

                    const itemData = {
                        station_id: stationDbId,
                        original_id: detailedItem?.id || null,
                        name: item.name,
                        calories: item.calories,
                        portion: item.portion,
                        date: today,
                        is_vegetarian: isVegetarian,
                        is_vegan: isVegan,
                        is_high_protein: isHighProtein
                    };

                    const { data: insertedItem, error: itemError } = await supabase
                        .from('menu_items')
                        .insert(itemData)
                        .select()
                        .single();

                    if (itemError) {
                        console.error(`Error storing item: ${itemError.message}`);
                        continue;
                    }

                    const menuItemId = insertedItem.id;

                    // Store nutrients
                    if (detailedItem?.nutrients && detailedItem.nutrients.length > 0) {
                        const nutrients = detailedItem.nutrients.map(nutrient => ({
                            menu_item_id: menuItemId,
                            name: nutrient.name,
                            value: nutrient.value,
                            uom: nutrient.uom,
                            value_numeric: nutrient.valueNumeric
                        }));

                        const { error: nutrientsError } = await supabase
                            .from('nutrients')
                            .insert(nutrients);

                        if (nutrientsError) {
                            console.error(`Error storing nutrients for ${item.name}: ${nutrientsError.message}`);
                        } else if (totalItems < 5) {
                            console.log(`    Stored ${nutrients.length} nutrients`);
                        }
                    } else if (totalItems < 5) {
                        console.log(`    No nutrients found for ${item.name}`);
                    }

                    totalItems++;
                }

                console.log(`Added ${station.items.length} items from ${station.name}`);
            }
        }
    }

    console.log(`\nSuccessfully stored ${totalItems} menu items with detailed data!`);
}

async function main() {
    console.log('Starting Northeastern Dining Menu Scraper\n');

    try {
        const menuData = await fetchMenuData();
        await storeMenuData(menuData);
        console.log('\nAll done!');
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

main();