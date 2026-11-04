import Link from "next/link";
import { claimItem, setClaimStatus, unclaimItem } from "@/app/actions";
import { itemImage } from "@/lib/photos";
import type { Item } from "@/lib/types";
import { SubmitButton } from "./SubmitButton";

function host(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "link"; }
}

export function ItemCard({ item, userId, canEdit, showClaims, showCreator, editHref }: {
  item: Item;
  userId: string;
  canEdit: boolean;
  showClaims: boolean;
  showCreator?: boolean;
  editHref: string;
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
              <Link href={editHref} className="-mt-1 -mr-1 shrink-0 rounded-lg px-2 py-1 text-sm font-medium text-muted active:bg-soft">Edit</Link>
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
              <SubmitButton className="btn-primary min-h-9 px-3.5 text-sm" pending="…">I&apos;ll get this</SubmitButton>
            </form>
          ) : mine ? (
            <>
              <span className={`text-sm font-semibold ${claim.status === "purchased" ? "text-ok" : "text-ink"}`}>
                {claim.status === "purchased" ? "✓ You bought this" : "You're getting this"}
              </span>
              <div className="ml-auto flex gap-1.5">
                <form action={unclaimItem}>
                  <input type="hidden" name="item_id" value={item.id} />
                  <SubmitButton className="btn-ghost min-h-9 px-2.5 text-sm text-muted" pending="…">Undo</SubmitButton>
                </form>
                <form action={setClaimStatus}>
                  <input type="hidden" name="item_id" value={item.id} />
                  <input type="hidden" name="status" value={claim.status === "purchased" ? "claimed" : "purchased"} />
                  <SubmitButton className="btn-secondary min-h-9 px-3 text-sm" pending="…">
                    {claim.status === "purchased" ? "Not bought" : "Mark bought"}
                  </SubmitButton>
                </form>
              </div>
            </>
          ) : (
            <span className="text-sm font-medium text-muted">
              {claim.status === "purchased" ? "Bought" : "Claimed"} by {claim.claimer?.display_name ?? "someone"}
            </span>
          )}
        </div>
      )}
    </article>
  );
}
