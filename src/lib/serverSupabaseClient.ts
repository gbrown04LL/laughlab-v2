import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/lib/env';

let _serverSupabase: SupabaseClient | null = null;

/**
 * Get or create a server-side Supabase client with service role privileges.
 * 
 * This client bypasses Row Level Security (RLS) and should only be used
 * in server-side code for administrative operations.
 * 
 * @returns {SupabaseClient | null} Supabase client or null if not configured
 */
export function getServerSupabaseClient(): SupabaseClient | null {
  if (_serverSupabase) return _serverSupabase;

  const config = getSupabaseConfig();
  if (!config) {
    return null;
  }

  _serverSupabase = createClient(config.url, config.serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return _serverSupabase;
}
