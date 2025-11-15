const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Create a single supabase client for interacting with your database
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cast_vote(location) {
    // Location must be either steast or iv
    if (location !== 'steast' && location !== 'iv') {
        console.error('Invalid location');
        return;
    }

    const today = new Date();
    const formattedDate = today.toISOString().substring(0, 10);

    // Fetch current votes for location
    const { data: row, error } = await supabase
        .from('steast_vs_iv')
        .select()
        .eq('date', formattedDate)
        .single();

    // Log errors
    if (error) {
        console.error('Error fetching votes:', error);
        return;
    }

    // Get current vote count for this location
    const votes = row[location] || 0;

    // Add 1 to current votes and push to Supabase
    const { data: updatedRow, error: updateError } = await supabase
        .from('steast_vs_iv')
        .update({ [location]: votes + 1 })
        .eq('date', formattedDate)
        .select();

    // Log errors
    if (updateError) {
        console.error('Error updating votes:', updateError);
    } else {
        console.log('Votes updated:', updatedRow);
    }
}

module.exports = { cast_vote };