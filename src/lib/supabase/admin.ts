import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client with the service-role key. Used for exactly one
 * thing: emailing invites (auth.admin.inviteUserByEmail). Never import this
 * from a client component, and never prefix the env var with NEXT_PUBLIC_.
 * Returns null when SUPABASE_SERVICE_ROLE_KEY isn't configured.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || typeof window !== "undefined") return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
