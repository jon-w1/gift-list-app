import { NextResponse, type NextRequest } from "next/server";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { createClient } from "@/lib/supabase/server";
import { nameFromUrl, parseHtml, tidyName, type Unfurled } from "@/lib/unfurl/parse";

/**
 * GET /api/unfurl?url=…  → { name, image_url, price, url, details }
 * Used by the "paste a link" box today, and by the future share-sheet extension.
 */
export const runtime = "nodejs";

const UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

function isPrivateIp(ip: string) {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v.startsWith("::ffff:")) return isPrivateIp(v.slice(7));
    return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80");
  }
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

async function assertPublic(u: URL) {
  if (!/^https?:$/.test(u.protocol)) throw new Error("bad protocol");
  if (u.port && !["80", "443"].includes(u.port)) throw new Error("bad port");
  const addrs = await lookup(u.hostname, { all: true });
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new Error("private address");
}

/** Fetch with manual redirects so every hop is checked (blocks SSRF via redirect). */
async function safeFetch(start: URL) {
  let current = start;
  for (let hop = 0; hop < 5; hop++) {
    await assertPublic(current);
    const res = await fetch(current, {
      redirect: "manual",
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml", "accept-language": "en-US,en;q=0.9" },
      signal: AbortSignal.timeout(8000),
    });
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      current = new URL(loc, current);
      continue;
    }
    return { res, finalUrl: current };
  }
  throw new Error("too many redirects");
}

async function readCapped(res: Response, max = 1_500_000) {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < max) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
  }
  reader.cancel().catch(() => {});
  return new TextDecoder().decode(Buffer.concat(chunks));
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const raw = req.nextUrl.searchParams.get("url")?.trim() ?? "";
  let target: URL;
  try {
    target = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return NextResponse.json({ error: "That doesn't look like a link" }, { status: 400 });
  }

  let result: Unfurled = { name: null, image_url: null, price: null, url: target.toString() };
  try {
    const { res, finalUrl } = await safeFetch(target);
    result.url = finalUrl.toString();
    if (res.ok && (res.headers.get("content-type") ?? "").includes("html")) {
      result = { ...parseHtml(await readCapped(res), finalUrl.toString()), url: finalUrl.toString() };
    }
  } catch {
    // Blocked or unreachable — fall through to URL-based guess.
  }

  // Stores that block bots (e.g. Amazon) return a captcha page titled "Amazon.com" etc.
  const looksBlocked = !result.name || /^(amazon(\.com)?|robot check|access denied|just a moment\.*)$/i.test(result.name);
  if (looksBlocked) result.name = nameFromUrl(result.url) ?? nameFromUrl(target.toString());

  const tidy = tidyName(result.name, result.url, result.site_name);
  result = { ...result, name: tidy.name, details: tidy.details };
  delete result.site_name;

  return NextResponse.json(result, { headers: { "cache-control": "private, max-age=3600" } });
}
