import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Skip static files, images, icons and the manifest.
  matcher: ["/((?!_next/static|_next/image|icons/|favicon.ico|manifest.webmanifest|.*\\.(?:png|jpg|svg|webp)$).*)"],
};
