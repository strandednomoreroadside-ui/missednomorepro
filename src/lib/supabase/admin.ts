import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";

/**
 * Service-role client — BYPASSES Row Level Security.
 *
 * Master plan §9: never import this from anything that runs in the
 * browser ("server-only" enforces that at build time). Use it only for
 * platform-admin reads and system writes like audit logs.
 */
export function createAdminClient() {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Admin client unavailable: SUPABASE_SERVICE_ROLE_KEY is not set (server-side env)."
    );
  }
  return createSupabaseClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
