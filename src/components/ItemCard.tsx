import { itemImages } from "@/lib/photos";
import { Thumb } from "./Thumb";
import type { Item } from "@/lib/types";
import { ItemSheet } from "./AddItemSheet";
import type { ItemInput } from "@/app/actions";

const toInput = (i: Item): ItemInput => ({
  id: i.id, person_id: i.person_id, kind: i.kind, name: i.name, notes: i.notes, url: i.url, image_url: i.image_url, photo_path: i.photo_path,
});
const EDIT_PLACEHOLDER = "Size, color, model, anything that helps";

function host(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "link"; }
}

/** Compact card for your own wishlist: tapping it opens the edit sheet. */
export function OwnItemCard({ item, userId }: { item: Item; userId: string }) {
  return (
    <ItemSheet
      className="card flex w-full items-center gap-3 p-3 text-left active:bg-soft"
      ariaLabel={`Edit ${item.name}`} title="Edit item" userId={userId} notesPlaceholder={EDIT_PLACEHOLDER} initial={toInput(item)}
    >
      <Thumb sources={itemImages(item)} className="h-16 w-16 shrink-0 rounded-xl" />
      <span className="block min-w-0 flex-1">
        <span className="line-clamp-2 text-[16px] leading-snug font-semibold break-words">{item.name}</span>
        {(item.notes || item.url) && (
          <span className="mt-0.5 block truncate text-[13px] text-muted">
            {[item.url && host(item.url), item.notes?.replace(/\s+/g, " ")].filter(Boolean).join(" · ")}
          </span>
        )}
      </span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-muted" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
    </ItemSheet>
  );
}
