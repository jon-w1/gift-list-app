import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Person } from "@/lib/types";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component — middleware refreshes the session instead.
          }
        },
      },
    },
  );
}

/**
 * The signed-in user's id, or null. Uses getClaims(): with Supabase's asymmetric signing
 * keys the token is verified on the server itself (no network trip to Supabase Auth);
 * with older symmetric keys it falls back to asking Auth, like getUser().
 */
export async function currentUserId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  return typeof sub === "string" && sub ? sub : null;
}

/**
 * Signed-in user + their own person row. Redirects to /login if signed out.
 * Cached per request, so pages and the components inside them share one lookup.
 */
export const requireMe = cache(async () => {
  const supabase = await createClient();
  const id = await currentUserId(supabase);
  if (!id) redirect("/login");
  const { data: me } = await supabase.from("people").select("*").eq("user_id", id).single<Person>();
  if (!me) redirect("/login");
  return { supabase, user: { id }, me };
});
