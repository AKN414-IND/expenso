import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Supabase URL and Anon Key are missing. Check your .env file and babel.config.js setup.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);