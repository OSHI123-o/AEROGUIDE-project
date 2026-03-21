import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnvConfig } from "./env.js";

let _supabaseAdmin: SupabaseClient | null = null;
let _supabaseClient: SupabaseClient | null = null;

/**
 * Returns a Supabase client using the **service_role** key.
 * This client bypasses RLS — use it only on the server side for admin ops.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (_supabaseAdmin) return _supabaseAdmin;

  const env = getEnvConfig();
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env for admin client"
    );
  }

  _supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _supabaseAdmin;
}

/**
 * Returns a Supabase client using the **anon** (public) key.
 * This client respects RLS.
 */
export function getSupabaseClient(): SupabaseClient {
  if (_supabaseClient) return _supabaseClient;

  const env = getEnvConfig();
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env for public client"
    );
  }

  _supabaseClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _supabaseClient;
}
