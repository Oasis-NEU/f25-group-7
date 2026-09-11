import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  const message =
    'Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in front-end/.env and rebuild.';

  // Vite inlines these at build time, so this is a deploy misconfiguration
  // rather than something a user can recover from. Say so on the page instead
  // of leaving a blank screen and an error only visible in the console.
  const root = typeof document !== 'undefined' && document.getElementById('root');
  if (root) {
    root.textContent = message;
    root.setAttribute('style', 'padding:2rem;font-family:system-ui,sans-serif;color:#fff;background:#000');
  }

  throw new Error(message);
}

export const supabase = createClient(supabaseUrl, supabaseKey);
