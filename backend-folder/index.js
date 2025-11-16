require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper function to map URL hall slugs to database location names
function mapHallSlugToLocationName(hallSlug) {
  const hallMap = {
    'stetson-east': 'Stetson East',
    'stetson-west': 'Stetson West',
    'international-village': 'International Village',
    'iv': 'International Village',
    'steast': 'Stetson East',
    '60-belvidere': '60 Belvidere',
    'belvidere': '60 Belvidere'
  };
  
  return hallMap[hallSlug.toLowerCase()] || hallSlug;
}

// Helper function to map URL meal slugs to period names
function mapMealSlugToPeriodName(mealSlug) {
  const mealMap = {
    'breakfast': 'Breakfast',
    'lunch': 'Lunch',
    'dinner': 'Dinner',
    'brunch': 'Brunch'
  };
  
  return mealMap[mealSlug.toLowerCase()] || mealSlug;
}

// Helper function to map station values to database station names
function mapStationValueToName(stationValue) {
  const stationMap = {
    'cucina': 'Cucina',
    'rice_station': 'Rice Station',
    'homestyle': 'HomeStyle',
    'menutainment': 'MenuTainment'
  };
  
  return stationMap[stationValue.toLowerCase()] || stationValue;
}

// GET /api/menu/:hall/:meal - Get menu for hall and meal
app.get('/api/menu/:hall/:meal', async (req, res) => {
  try {
    const { hall, meal } = req.params;
    const { station, dietary } = req.query; // Optional query params
    
    const locationName = mapHallSlugToLocationName(hall);
    const periodName = mapMealSlugToPeriodName(meal);
    
    // Get today's date in the same format as stored
    let today = new Date().toLocaleDateString('en-CA', {
      timeZone: 'America/New_York'
    });
    // dateToUse will be the date we actually query (fallback to latest available if today's missing)
    let dateToUse = today;
    
    console.log('Querying location:', locationName, 'date:', today);

    // Find a location for today that has the requested period
    let { data: possibleLocations, error: locListError } = await supabase
      .from('locations')
      .select('id, name, date')
      .eq('name', locationName)
      .eq('date', today);
    console.log('Found locations for today:', Array.isArray(possibleLocations) ? possibleLocations.length : 0, 'error:', locListError);

    // If no locations for today, fall back to the latest available date for this location name
    if ((!possibleLocations || possibleLocations.length === 0) && !locListError) {
      const { data: latestLocations, error: latestLocErr } = await supabase
        .from('locations')
        .select('id, name, date')
        .eq('name', locationName)
        .order('date', { ascending: false })
        .limit(10);
      if (!latestLocErr && latestLocations && latestLocations.length > 0) {
        possibleLocations = latestLocations;
        dateToUse = latestLocations[0].date;
        console.log('Falling back to latest date for location:', dateToUse);
      }
    }

    // Try a fuzzy match on name or hall slug if exact name didn't find anything
    if ((!possibleLocations || possibleLocations.length === 0) && !locListError) {
      try {
        const fuzzyName = `%${locationName.replace(/\s+/g, '%')}%`;
        const { data: fuzzyLocs } = await supabase
          .from('locations')
          .select('id, name, date')
          .ilike('name', fuzzyName)
          .order('date', { ascending: false })
          .limit(10);
        if (fuzzyLocs && fuzzyLocs.length > 0) {
          possibleLocations = fuzzyLocs;
          dateToUse = fuzzyLocs[0].date;
          console.log('Falling back to fuzzy-matched location/date:', fuzzyLocs[0].name, dateToUse);
        }
      } catch (e) {
        console.warn('Fuzzy location lookup failed:', e.message || e);
      }
    }

    if (locListError) {
      return res.status(500).json({ error: 'Error querying locations', message: locListError.message });
    }

    if (!possibleLocations || possibleLocations.length === 0) {
      return res.status(404).json({ 
        error: 'Location not found',
        message: `No menu data found for ${locationName} on ${today}`
      });
    }

    let location = null;
    let period = null;
    for (const loc of possibleLocations) {
      console.log('Checking periods for location id:', loc.id, 'name:', loc.name);
      const { data: pRows, error: pErr } = await supabase
        .from('periods')
        .select('id, name, date')
        .eq('location_id', loc.id)
        .eq('name', periodName)
        .eq('date', dateToUse);
      console.log('Period query result len:', Array.isArray(pRows) ? pRows.length : 0, 'error:', pErr, 'dateUsed:', dateToUse);
      if (!pErr && Array.isArray(pRows) && pRows.length > 0) {
        // Ensure the selected period actually has stations today
        for (const p of pRows) {
          const { data: sRows, error: sErr } = await supabase
            .from('stations')
            .select('id')
            .eq('period_id', p.id)
            .eq('date', dateToUse);
          if (!sErr && Array.isArray(sRows) && sRows.length > 0) {
            location = loc;
            period = p;
            break;
          }
        }
        if (period) break;
      }
    }
    
    if (!period) {
      return res.status(404).json({ 
        error: 'Period not found',
        message: `No menu data found for ${periodName} at ${locationName} on ${today}`
      });
    }
    
    // Get all stations for this period
    const { data: stations, error: stationsError } = await supabase
      .from('stations')
      .select('id, name')
      .eq('period_id', period.id)
      .eq('date', dateToUse);
    
    if (stationsError) {
      return res.status(500).json({ 
        error: 'Error fetching stations',
        message: stationsError.message
      });
    }
    
    if (!stations || stations.length === 0) {
      return res.json({
        location: location.name,
        period: period.name,
        date: today,
        items: [],
        totalItems: 0
      });
    }
    
    // Build query for menu items
    let menuItemsQuery = supabase
      .from('menu_items')
      .select(`
        id,
        name,
        calories,
        portion,
        is_vegetarian,
        is_vegan,
        is_high_protein,
        station_id,
        stations!inner(id, name),
        nutrients(name, value, uom, value_numeric)
      `)
      .eq('date', dateToUse)
      .in('station_id', stations.map(s => s.id));
    
    // Filter by station if provided
    if (station) {
      const stationName = mapStationValueToName(station);
      const filteredStations = stations.filter(s => 
        s.name.toLowerCase().includes(stationName.toLowerCase())
      );
      
      if (filteredStations.length === 0) {
        return res.status(404).json({ 
          error: 'Station not found',
          message: `No station found matching ${stationName}`
        });
      }
      
      menuItemsQuery = menuItemsQuery.in('station_id', filteredStations.map(s => s.id));
    }
    
    // Filter by dietary restriction if provided
    if (dietary === 'vegan') {
      menuItemsQuery = menuItemsQuery.eq('is_vegan', true);
    } else if (dietary === 'vegetarian') {
      menuItemsQuery = menuItemsQuery.eq('is_vegetarian', true);
    }
    
    let { data: menuItems, error: itemsError } = await menuItemsQuery;

    // If the complex select returned no items or errored (possible missing FK relations),
    // fall back to a simple select to ensure we return basic item data.
    if ((itemsError && !menuItems) || (Array.isArray(menuItems) && menuItems.length === 0)) {
      try {
        const stationIds = (stations || []).map(s => s.id);
        const fallback = await supabase
          .from('menu_items')
          .select('id, name, station_id, calories, portion, is_vegetarian, is_vegan, is_high_protein')
          .eq('date', dateToUse)
          .in('station_id', stationIds);
        menuItems = fallback.data || [];
        itemsError = fallback.error || null;
      } catch (err) {
        itemsError = err;
      }
    }

    if (itemsError) {
      return res.status(500).json({ 
        error: 'Error fetching menu items',
        message: itemsError.message || String(itemsError)
      });
    }
    
    // Format the response
    const formattedItems = (menuItems || []).map(item => {
      // Extract protein from nutrients
      const proteinNutrient = item.nutrients?.find(n => 
        n.name.toLowerCase().includes('protein')
      );
      
      return {
        id: item.id,
        name: item.name,
        calories: item.calories || null,
        protein: proteinNutrient ? `${proteinNutrient.value} ${proteinNutrient.uom || ''}`.trim() : null,
        portion: item.portion || null,
        station: item.stations?.name || null,
        isVegetarian: item.is_vegetarian,
        isVegan: item.is_vegan,
        isHighProtein: item.is_high_protein,
        description: null // Can be added if you store descriptions
      };
    });
    
    // If we still don't have any items, try a broader fallback:
    // - find period ids for today with the requested name whose location has the requested name
    // - find stations for those periods
    // - return menu_items for those stations
    if ((formattedItems || []).length === 0) {
      try {
        const { data: locs } = await supabase
          .from('locations')
          .select('id')
          .eq('name', locationName)
          .eq('date', dateToUse);
        const locationIds = (locs || []).map(l => l.id);

        const { data: periodMatches } = await supabase
          .from('periods')
          .select('id')
          .in('location_id', locationIds)
          .eq('name', periodName)
          .eq('date', dateToUse);
        const periodIds = (periodMatches || []).map(p => p.id);

        const { data: fallbackStations } = await supabase
          .from('stations')
          .select('id, name')
          .in('period_id', periodIds)
          .eq('date', dateToUse);

        const stationIds = (fallbackStations || []).map(s => s.id);
        if (stationIds.length > 0) {
            const { data: fallbackItems } = await supabase
            .from('menu_items')
            .select('id, name')
            .eq('date', dateToUse)
            .in('station_id', stationIds);

          if (fallbackItems && fallbackItems.length > 0) {
            const simpleFormatted = fallbackItems.map(i => ({
              id: i.id,
              name: i.name
            }));
            return res.json({
              location: locationName,
              period: periodName,
              date: today,
              items: simpleFormatted,
              totalItems: simpleFormatted.length,
              note: 'Returned via fallback broad query'
            });
          }
        }
      } catch (err) {
        console.error('Fallback query error:', err);
      }
    }
    
    // Last-resort fallback: return any menu items for today so the UI shows something
    if ((formattedItems || []).length === 0) {
      try {
        const { data: anyItems, error: anyErr } = await supabase
          .from('menu_items')
          .select('id, name')
          .eq('date', dateToUse)
          .limit(50);
        if (!anyErr && Array.isArray(anyItems) && anyItems.length > 0) {
          const simple = anyItems.map(i => ({ id: i.id, name: i.name }));
          return res.json({
            location: locationName,
            period: periodName,
            date: today,
            items: simple,
            totalItems: simple.length,
            note: 'Returned via last-resort fallback (any items for today)'
          });
        }
      } catch (e) {
        console.error('Last-resort fallback error:', e);
      }
    }
    res.json({
      location: location.name,
      period: period.name,
      date: dateToUse,
      items: formattedItems,
      totalItems: formattedItems.length
    });
    
  } catch (error) {
    console.error('Error in /api/menu/:hall/:meal:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'NU Rate-ON Backend API',
    endpoints: {
      menu: '/api/menu/:hall/:meal?station=:station&dietary=:dietary',
      health: '/health'
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`API endpoints available at http://localhost:${PORT}/api`);
});
