"use client";

import { useState } from "react";
import { claimItem, unclaimItem, type ItemInput } from "@/app/actions";
import { itemImages } from "@/lib/photos";
import type { Item } from "@/lib/types";
import { ItemForm } from "./ItemForm";
import { Sheet, useSheet } from "./Sheet";
import { SubmitButton } from "./SubmitButton";
import { Thumb } from "./Thumb";

function host(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "link"; }
}
const firstName = (n?: string | null) => (n ?? "someone").split(" ")[0];

/**
 * Compact, scannable row for someone else's list (wishlist, suggestions, your notepad).
 * One tap on the right marks it bought; tapping the row opens the full details.
 */
export function ItemRow({ item, userId, canEdit, showCreator }: {
  item: Item;
  userId: string;
  canEdit: boolean;
  showCreator?: boolean;
}) {
  const sheet = useSheet();
  const [mode, setMode] = useState<"view" | "edit">("view");
  const claim = item.claim;
  const mine = claim?.claimed_by === userId;
  const boughtByOther = !!claim && !mine;
  const meta = [
    showCreator && item.creator && `from ${firstName(item.creator.display_name)}`,
    item.url && host(item.url),
    item.notes?.replace(/\s+/g, " "),
  ].filter(Boolean).join(" · ");
  const input: ItemInput = {
    id: item.id, person_id: item.person_id, kind: item.kind, name: item.name, notes: item.notes, url: item.url, image_url: item.image_url, photo_path: item.photo_path,
  };

  return (
    <>
      <div className={`card flex items-center gap-2 p-2 pr-2.5 ${boughtByOther ? "opacity-60" : ""}`}>
        <button type="button" onClick={() => { setMode("view"); sheet.show(); }} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-0.5 text-left active:bg-soft" aria-label={`Details for ${item.name}`}>
          <Thumb sources={itemImages(item)} className="h-14 w-14 shrink-0 rounded-xl" />
          <span className="block min-w-0 flex-1">
            <span className={`line-clamp-2 text-[15px] leading-snug font-semibold break-words ${claim ? "text-muted" : ""}`}>{item.name}</span>
            {meta && <span className="mt-0.5 block truncate text-[13px] text-muted">{meta}</span>}
          </span>
        </button>
        <div className="shrink-0">
          {!claim ? (
            <form action={claimItem}>
              <input type="hidden" name="item_id" value={item.id} />
              <SubmitButton className="btn min-h-9 border border-accent/40 px-3 text-[13px] text-accent" pending="…">Mark bought</SubmitButton>
            </form>
          ) : mine ? (
            <span className="text-[13px] font-semibold text-ok">✓ You</span>
          ) : (
            <span className="text-[13px] font-medium text-muted">✓ {firstName(claim.claimer?.display_name)}</span>
          )}
        </div>
      </div>

      <Sheet sheet={sheet} title={mode === "edit" ? "Edit item" : "Item"}>
        {mode === "edit" ? (
          <ItemForm userId={userId} backHref="/" onDone={sheet.hide} notesPlaceholder="Size, color, model, anything that helps" initial={input} />
        ) : (
          <div className="space-y-4 px-4 pt-2 pb-[max(env(safe-area-inset-bottom),16px)]">
            <div className="flex gap-4">
              <Thumb sources={itemImages(item)} className="h-28 w-28 shrink-0 rounded-2xl" />
              <div className="min-w-0 flex-1">
                <h3 className="text-[17px] leading-snug font-semibold break-words">{item.name}</h3>
                {showCreator && item.creator && <p className="mt-1 text-[13px] text-muted">Suggested by {item.creator.display_name}</p>}
              </div>
            </div>
            {item.notes && <p className="text-[15px] leading-snug whitespace-pre-line">{item.notes}</p>}
            {item.url && (
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="btn-secondary w-full">Open on {host(item.url)} ↗</a>
            )}
            <div className="rounded-2xl bg-soft px-4 py-3">
              {!claim ? (
                <form action={claimItem} className="flex items-center gap-3">
                  <span className="flex-1 text-[14px] text-muted">Not bought yet</span>
                  <input type="hidden" name="item_id" value={item.id} />
                  <SubmitButton className="btn-primary min-h-10 px-4 text-sm" pending="…">Mark bought</SubmitButton>
                </form>
              ) : mine ? (
                <form action={unclaimItem} className="flex items-center gap-3">
                  <span className="flex-1 text-[14px] font-semibold text-ok">✓ You bought this</span>
                  <input type="hidden" name="item_id" value={item.id} />
                  <SubmitButton className="btn-ghost min-h-10 px-3 text-sm text-muted" pending="…">Undo</SubmitButton>
                </form>
              ) : (
                <p className="text-[14px] font-medium text-muted">✓ Bought by {claim.claimer?.display_name ?? "someone"}</p>
              )}
            </div>
            {canEdit && <button type="button" className="btn-ghost w-full text-muted" onClick={() => setMode("edit")}>Edit item</button>}
          </div>
        )}
      </Sheet>
    </>
  );
}
