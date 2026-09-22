// A single shared Supabase client for the whole app.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

export const configured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let client = null;

export function getClient() {
  if (!configured) {
    throw new Error("This cookbook isn't connected to its database yet. Add your Supabase project URL and anon key to js/supabase-config.js.");
  }
  if (!client) client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}
