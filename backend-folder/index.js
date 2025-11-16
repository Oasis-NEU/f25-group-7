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
    const today = new Date().toLocaleDateString('en-CA', {
      timeZone: 'America/New_York'
    });
    
    // First, find the location
    const { data: location, error: locError } = await supabase
      .from('locations')
      .select('id, name')
      .eq('name', locationName)
      .eq('date', today)
      .single();
    
    if (locError || !location) {
      return res.status(404).json({ 
        error: 'Location not found',
        message: `No menu data found for ${locationName} on ${today}`
      });
    }
    
    // Find the period (meal time)
    const { data: period, error: periodError } = await supabase
      .from('periods')
      .select('id, name')
      .eq('location_id', location.id)
      .eq('name', periodName)
      .eq('date', today)
      .single();
    
    if (periodError || !period) {
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
      .eq('date', today);
    
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
      .eq('date', today)
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
    
    const { data: menuItems, error: itemsError } = await menuItemsQuery;
    
    if (itemsError) {
      return res.status(500).json({ 
        error: 'Error fetching menu items',
        message: itemsError.message
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
    
    res.json({
      location: location.name,
      period: period.name,
      date: today,
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
