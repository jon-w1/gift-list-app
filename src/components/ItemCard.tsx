import { claimItem, unclaimItem } from "@/app/actions";
import { itemImage } from "@/lib/photos";
import type { Item } from "@/lib/types";
import { SubmitButton } from "./SubmitButton";
import { ItemSheet } from "./AddItemSheet";
import type { ItemInput } from "@/app/actions";

const toInput = (i: Item): ItemInput => ({
  id: i.id, person_id: i.person_id, kind: i.kind, name: i.name, notes: i.notes, url: i.url, image_url: i.image_url, photo_path: i.photo_path,
});
const EDIT_PLACEHOLDER = "Size, color, model, anything that helps";

function host(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "link"; }
}

export function ItemCard({ item, userId, canEdit, showClaims, showCreator }: {
  item: Item;
  userId: string;
  canEdit: boolean;
  showClaims: boolean;
  showCreator?: boolean;
}) {
  const img = itemImage(item);
  const claim = item.claim;
  const mine = claim?.claimed_by === userId;

  return (
    <article className={`card overflow-hidden ${claim && !mine && showClaims ? "opacity-70" : ""}`}>
      <div className="flex gap-3 p-3.5">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" className="h-20 w-20 shrink-0 rounded-xl border border-line bg-soft object-cover" loading="lazy" referrerPolicy="no-referrer" />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-soft text-2xl" aria-hidden="true">🎁</div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className="min-w-0 flex-1 text-[16px] leading-snug font-semibold break-words">{item.name}</h3>
            {canEdit && (
              <ItemSheet
                className="-mt-1 -mr-1 shrink-0 rounded-lg px-2 py-1 text-sm font-medium text-muted active:bg-soft"
                ariaLabel={`Edit ${item.name}`} title="Edit item" userId={userId} notesPlaceholder={EDIT_PLACEHOLDER} initial={toInput(item)}
              >
                Edit
              </ItemSheet>
            )}
          </div>
          {item.notes && <p className="mt-1 text-[14px] leading-snug whitespace-pre-line text-muted">{item.notes}</p>}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
            {item.url && (
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-medium text-accent underline-offset-2 active:underline">
                {host(item.url)} ↗
              </a>
            )}
            {showCreator && item.creator && <span className="text-muted">Suggested by {item.creator.display_name}</span>}
          </div>
        </div>
      </div>

      {showClaims && (
        <div className="flex items-center gap-2 border-t border-line bg-soft/60 px-3.5 py-2.5">
          {!claim ? (
            <form action={claimItem} className="ml-auto">
              <input type="hidden" name="item_id" value={item.id} />
              <SubmitButton className="btn-primary min-h-9 px-3.5 text-sm" pending="…">Mark bought</SubmitButton>
            </form>
          ) : mine ? (
            <>
              <span className="text-sm font-semibold text-ok">✓ You bought this</span>
              <form action={unclaimItem} className="ml-auto">
                <input type="hidden" name="item_id" value={item.id} />
                <SubmitButton className="btn-ghost min-h-9 px-2.5 text-sm text-muted" pending="…">Undo</SubmitButton>
              </form>
            </>
          ) : (
            <span className="text-sm font-medium text-muted">✓ Bought by {claim.claimer?.display_name ?? "someone"}</span>
          )}
        </div>
      )}
    </article>
  );
}

/** Compact card for your own wishlist: tapping it opens the edit sheet. */
export function OwnItemCard({ item, userId }: { item: Item; userId: string }) {
  const img = itemImage(item);
  return (
    <ItemSheet
      className="card flex w-full items-center gap-3 p-3 text-left active:bg-soft"
      ariaLabel={`Edit ${item.name}`} title="Edit item" userId={userId} notesPlaceholder={EDIT_PLACEHOLDER} initial={toInput(item)}
    >
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt="" className="h-16 w-16 shrink-0 rounded-xl border border-line bg-soft object-cover" loading="lazy" referrerPolicy="no-referrer" />
      ) : (
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-soft text-2xl" aria-hidden="true">🎁</span>
      )}
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
