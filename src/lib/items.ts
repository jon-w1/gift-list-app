import type { Claim, Item } from "@/lib/types";

/** Shared select: item + who added it + its claim (the database hides claims from the recipient). */
export const ITEM_SELECT =
  "*, creator:people!items_created_by_fkey(display_name), claim:claims(item_id, claimed_by, status, claimer:people!claims_claimed_by_fkey(display_name))";

type Raw = Omit<Item, "claim"> & { claim: Claim | Claim[] | null };

export function normalizeItems(rows: Raw[] | null): Item[] {
  return (rows ?? []).map((r) => ({ ...r, claim: Array.isArray(r.claim) ? r.claim[0] ?? null : r.claim }));
}
