import { createClient } from '@supabase/supabase-js'

const supabaseURL = import.meta.env.VITE_SUPABASE_URL;
const supabasePublicKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
console.log(supabaseURL)
console.log(supabasePublicKey)
export const supabase = createClient(supabaseURL, supabasePublicKey);