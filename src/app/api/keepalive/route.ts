import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Daily ping (see vercel.json) so the free Supabase project never pauses
 * between holidays. Harmless to call publicly.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data, error } = await supabase.rpc("ping");
  return NextResponse.json({ ok: !error && data === "ok", at: new Date().toISOString() }, { status: error ? 500 : 200 });
}
