import * as cheerio from "cheerio";

export type Unfurled = { name: string | null; image_url: string | null; price: string | null; url: string };

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
    meta("og:image:secure_url", "og:image", "twitter:image") ?? ldImageUrl ?? $("#landingImage").attr("data-old-hires") ?? null,
    pageUrl,
  );
  const price =
    formatPrice(offer?.price ?? offer?.lowPrice, offer?.priceCurrency) ??
    formatPrice(meta("product:price:amount", "og:price:amount"), meta("product:price:currency", "og:price:currency"));

  return { name, image_url, price, url: pageUrl };
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
