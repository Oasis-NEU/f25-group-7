import { supabase } from '../config/supabaseClient.js';

async function cast_vote(location) {
    // Location must be either steast or iv
    if (location !== 'steast' && location !== 'iv') {
        console.error('Invalid location');
    }

    const today = new Date();
    const formattedDate = today.toISOString().substring(0, 10);

    // Fetch current votes for location
    const { data: row, error } = await supabase
    .from('steast_vs_iv')
    .select()
    .eq('date', formattedDate)
    .single()

    // Log errorsS
    if (error) {
    console.error('Error fetching votes:', error)
    } else {
    const votes = row.location

    // Add 1 to current votes and push to Supabase
    const { data: updatedRow, error: updateError } = await supabase
        .from('steast_vs_iv')
        .update({ location: votes + 1 })
        .eq('date', formattedDate)
        .select()

    // Log errors
    if (updateError) {
        console.error('Error updating votes:', updateError)
    } else {
        console.log('Votes updated:', updatedRow)
    }
    }
}