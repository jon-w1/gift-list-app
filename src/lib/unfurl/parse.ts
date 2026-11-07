import * as cheerio from "cheerio";

export type Unfurled = { name: string | null; image_url: string | null; price: string | null; url: string; details?: string | null; site_name?: string | null };

const clean = (s: string | null | undefined, max = 200) => {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  return t ? t.slice(0, max) : null;
};

function absolute(src: string | null | undefined, base: string) {
  if (!src) return null;
  try {
    const u = new URL(src, base);
    return /^https?:$/.test(u.protocol) ? u.toString() : null;
  } catch {
    return null;
  }
}

function formatPrice(amount: unknown, currency: unknown) {
  const n = typeof amount === "string" ? parseFloat(amount) : typeof amount === "number" ? amount : NaN;
  if (!isFinite(n) || n <= 0) return null;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: String(currency || "USD") }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

/** Find a schema.org Product in JSON-LD (many stores include one). */
function findProduct(node: unknown): Record<string, unknown> | null {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const n of node) { const p = findProduct(n); if (p) return p; }
    return null;
  }
  const obj = node as Record<string, unknown>;
  const type = obj["@type"];
  if (type === "Product" || (Array.isArray(type) && type.includes("Product"))) return obj;
  return findProduct(obj["@graph"]);
}

/** Amazon product pages: the main image's hi-res URL, or the largest in data-a-dynamic-image. */
function amazonMainImage($: cheerio.CheerioAPI) {
  const img = $("#landingImage, #imgBlkFront, #ebooksImgBlkFront").first();
  const hires = img.attr("data-old-hires");
  if (hires?.trim()) return hires.trim();
  try {
    const sizes = JSON.parse(img.attr("data-a-dynamic-image") ?? "{}") as Record<string, [number, number]>;
    return Object.entries(sizes).sort((a, b) => b[1][0] * b[1][1] - a[1][0] * a[1][1])[0]?.[0] ?? null;
  } catch {
    return null;
  }
}

export function parseHtml(html: string, pageUrl: string): Unfurled {
  const $ = cheerio.load(html);
  const meta = (...keys: string[]) => {
    for (const k of keys) {
      const v = $(`meta[property="${k}"]`).attr("content") ?? $(`meta[name="${k}"]`).attr("content");
      if (v?.trim()) return v.trim();
    }
    return null;
  };

  let product: Record<string, unknown> | null = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (product) return;
    try { product = findProduct(JSON.parse($(el).text())); } catch { /* ignore bad JSON */ }
  });
  const p = product as Record<string, unknown> | null;

  const ldImage = p?.image;
  const ldImageUrl = typeof ldImage === "string" ? ldImage
    : Array.isArray(ldImage) ? (typeof ldImage[0] === "string" ? ldImage[0] : (ldImage[0] as { url?: string })?.url)
    : (ldImage as { url?: string } | undefined)?.url;
  const offers = p?.offers as Record<string, unknown> | Record<string, unknown>[] | undefined;
  const offer = Array.isArray(offers) ? offers[0] : offers;

  const name = clean(
    (p?.name as string) || meta("og:title", "twitter:title") || $("#productTitle").text().trim() || $("title").first().text(),
  );
  const image_url = absolute(
    meta("og:image:secure_url", "og:image", "twitter:image") ?? ldImageUrl ?? amazonMainImage($) ?? null,
    pageUrl,
  );
  const price =
    formatPrice(offer?.price ?? offer?.lowPrice, offer?.priceCurrency) ??
    formatPrice(meta("product:price:amount", "og:price:amount"), meta("product:price:currency", "og:price:currency"));

  return { name, image_url, price, url: pageUrl, site_name: meta("og:site_name") };
}

const SITE_DOMAIN = /\b[a-z0-9-]+\.(com|net|org|co|co\.uk|ca|de|fr|es|it|com\.au|shop|store|us)\b/i;
const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Turn a store's page title into a readable item name.
 * "Amazon.com | BENPAO Men's Sneakers(Dark Grey,US12) | Low Top Business,… | Fashion Sneakers"
 *   → name "BENPAO Men's Sneakers", details "Dark Grey, US12"
 */
export function tidyName(raw: string | null | undefined, pageUrl?: string, siteName?: string | null): { name: string | null; details: string | null } {
  const text = clean(raw, 1000);
  if (!text) return { name: null, details: null };
  let brand = "";
  try { brand = new URL(pageUrl ?? "").hostname.replace(/^www\./, "").split(".")[0]; } catch { /* no url */ }
  const isSite = (seg: string) => {
    const k = squash(seg);
    return !k || SITE_DOMAIN.test(seg) || (!!brand && k === squash(brand)) || (!!siteName && k === squash(siteName));
  };

  // Split on "|" and " : " (and "Amazon.com:"); keep the first part that isn't the store's name.
  const parts = text.split(/\s*\|\s*|\s+:\s+|(?<=\.[a-z]{2,4}):\s*/i).map((p) => p.trim()).filter(Boolean);
  let name = parts.find((p) => !isSite(p)) ?? text;
  // " - Walmart.com" style suffixes: drop dash-separated pieces only when they're the store's name.
  const dashed = name.split(/\s+[-–—]\s+/);
  if (dashed.length > 1 && dashed.some(isSite)) name = dashed.filter((p) => !isSite(p)).join(" - ");

  // Variant info in brackets goes to details: "(Dark Grey,US12)" → "Dark Grey, US12".
  const details: string[] = [];
  name = name.replace(/\s*[([]([^)\]]{1,80})[)\]]/g, (_, inner: string) => {
    details.push(inner.replace(/\s*,\s*/g, ", ").trim());
    return " ";
  }).replace(/\s+/g, " ").trim();

  // Still long? Cut at a comma, else at a word boundary.
  const MAX = 70;
  if (name.length > MAX) {
    const comma = name.indexOf(",");
    name = comma >= 15 && comma <= MAX ? name.slice(0, comma) : name.slice(0, name.lastIndexOf(" ", MAX) > 20 ? name.lastIndexOf(" ", MAX) : MAX);
  }
  name = name.replace(/[\s,;:–—-]+$/, "").trim();
  return { name: name || clean(text, MAX), details: details.filter(Boolean).join("; ") || null };
}

/** Fallback when a store blocks us: guess a name from the URL (works well for Amazon). */
export function nameFromUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    const parts = u.pathname.split("/").filter(Boolean);
    const dp = parts.findIndex((s) => s === "dp" || s === "gp");
    const slug = dp > 0 ? parts[dp - 1] : parts.sort((a, b) => b.length - a.length)[0];
    if (!slug || slug.length < 6 || !/[a-z]/i.test(slug) || /^[A-Z0-9]{10}$/.test(slug)) return null;
    const words = decodeURIComponent(slug).replace(/\.(html?|php|aspx?)$/i, "").replace(/[-_+]+/g, " ").trim();
    if (words.split(/\s+/).length < 2) return null;
    const titled = words === words.toLowerCase() ? words.replace(/\b[a-z]/g, (c) => c.toUpperCase()) : words;
    return clean(titled);
  } catch {
    return null;
  }
}
