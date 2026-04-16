import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('[DEBUG] VITE_SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING');
console.log('[DEBUG] VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'MISSING');
console.log('[DEBUG] VITE_SUPABASE_PUBLISHABLE_KEY:', import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? 'SET' : 'MISSING');

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in front-end/.env');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
