// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);          // should log URL
console.log('Supabase Key:', supabaseAnonKey);      // should log key

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
