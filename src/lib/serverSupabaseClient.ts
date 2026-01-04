import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _serverSupabase: SupabaseClient | null = null;

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  '';
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  '';

export function getServerSupabaseClient(): SupabaseClient | null {
  if (_serverSupabase) return _serverSupabase;
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  _serverSupabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return _serverSupabase;
}

