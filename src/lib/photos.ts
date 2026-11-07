export const PHOTO_BUCKET = "item-photos";

export function photoUrl(path: string | null | undefined) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`;
}

/** The picture to show for an item: an uploaded photo wins over a link preview image. */
export function itemImage(item: { photo_path: string | null; image_url: string | null }) {
  return photoUrl(item.photo_path) ?? item.image_url;
}

/** Amazon product ID (ASIN) from a product link, e.g. /dp/B0C2H9XSBK. */
export function amazonAsin(url: string | null | undefined) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!/(^|\.)amazon\.[a-z.]+$/i.test(u.hostname)) return null;
    return /\/(?:dp|gp\/product|gp\/aw\/d|exec\/obidos\/asin|o\/ASIN)\/([A-Z0-9]{10})(?:[/?]|$)/i.exec(u.pathname + "/")?.[1]?.toUpperCase() ?? null;
  } catch {
    return null;
  }
}

/**
 * Amazon's long-standing image address for a product ID. Unofficial: for some products it
 * returns a tiny blank placeholder, which <Thumb> detects and replaces with the gift icon.
 */
export function amazonImage(url: string | null | undefined) {
  const asin = amazonAsin(url);
  return asin ? `https://m.media-amazon.com/images/P/${asin}.01._SCLZZZZZZZ_SX500_.jpg` : null;
}

/** Pictures to try, best first. */
export function itemImages(item: { photo_path: string | null; image_url: string | null; url?: string | null }) {
  return [itemImage(item), amazonImage(item.url)].filter((x, i, a): x is string => !!x && a.indexOf(x) === i);
}

/** Shrink a phone photo to ≤1200px JPEG before upload (saves free-tier storage). */
export async function resizeImage(file: File, max = 1200): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not process photo"))), "image/jpeg", 0.82),
  );
}
