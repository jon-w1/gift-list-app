export const PHOTO_BUCKET = "item-photos";

export function photoUrl(path: string | null | undefined) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`;
}

/** The picture to show for an item: an uploaded photo wins over a link preview image. */
export function itemImage(item: { photo_path: string | null; image_url: string | null }) {
  return photoUrl(item.photo_path) ?? item.image_url;
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
