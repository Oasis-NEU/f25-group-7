<<<<<<< HEAD
import { createClient } from '@supabase/supabase-js'

// Create a single supabase client for interacting with your database
const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
=======
import { supabase } from '../config/supabaseClient.js';
>>>>>>> c5313f0e4ec2145a78503569cf51daf1e2380610

async function cast_vote(location) {
    // Location must be either steast or iv
    if (location !== 'steast' && location !== 'iv') {
        console.error('Invalid location');
    }

<<<<<<< HEAD
    // Fetch current votes for location
    const { data: row, error } = await supabase
    .from('steast_vs_iv')
    .select('votes')
    .eq('name', location)
=======
    const today = new Date();
    const formattedDate = today.toISOString().substring(0, 10);

    // Fetch current votes for location
    const { data: row, error } = await supabase
    .from('steast_vs_iv')
    .select()
    .eq('date', formattedDate)
>>>>>>> c5313f0e4ec2145a78503569cf51daf1e2380610
    .single()

    // Log errorsS
    if (error) {
    console.error('Error fetching votes:', error)
    } else {
<<<<<<< HEAD
    const votes = row.votes

    // Add 1 to current votes and push to Supabase
    const { data: updatedRow, error: updateError } = await supabase
        .from('instruments')
        .update({ votes: votes + 1 })
        .eq('name', location)
=======
    const votes = row.location

    // Add 1 to current votes and push to Supabase
    const { data: updatedRow, error: updateError } = await supabase
        .from('steast_vs_iv')
        .update({ location: votes + 1 })
        .eq('date', formattedDate)
>>>>>>> c5313f0e4ec2145a78503569cf51daf1e2380610
        .select()

    // Log errors
    if (updateError) {
        console.error('Error updating votes:', updateError)
    } else {
        console.log('Votes updated:', updatedRow)
    }
    }
}