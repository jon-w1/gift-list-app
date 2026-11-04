import Link from "next/link";
import { requireMe } from "@/lib/supabase/server";
import { Empty, Header } from "@/components/Header";
import { setClaimStatus, unclaimItem } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { itemImage } from "@/lib/photos";

export const metadata = { title: "Shopping list" };

type Row = {
  item_id: string;
  status: "claimed" | "purchased";
  item: { id: string; name: string; notes: string | null; url: string | null; image_url: string | null; photo_path: string | null; kind: string; person: { id: string; display_name: string } | null } | null;
};

export default async function Shopping() {
  const { supabase, user } = await requireMe();
  const { data } = await supabase
    .from("claims")
    .select("item_id, status, item:items(id, name, notes, url, image_url, photo_path, kind, person:people!items_person_id_fkey(id, display_name))")
    .eq("claimed_by", user.id)
    .order("created_at", { ascending: false })
    .returns<Row[]>();

  const rows = (data ?? []).filter((r) => r.item?.person);
  const groups = new Map<string, { name: string; rows: Row[] }>();
  for (const r of rows) {
    const p = r.item!.person!;
    if (!groups.has(p.id)) groups.set(p.id, { name: p.display_name, rows: [] });
    groups.get(p.id)!.rows.push(r);
  }

  return (
    <main className="safe-bottom">
      <Header back="/" title="Shopping list" />
      <div className="space-y-6 px-4 pt-4">
        {rows.length === 0 && (
          <Empty>Nothing claimed yet. Tap &ldquo;I&apos;ll get this&rdquo; on someone&apos;s list and it shows up here.</Empty>
        )}
        {[...groups.entries()].map(([pid, g]) => (
          <section key={pid}>
            <Link href={`/p/${pid}`} className="mb-2 block px-1 text-sm font-semibold tracking-wide text-muted uppercase">For {g.name}</Link>
            <ul className="card divide-y divide-line overflow-hidden">
              {g.rows.map((r) => {
                const it = r.item!;
                const img = itemImage(it);
                const done = r.status === "purchased";
                return (
                  <li key={r.item_id} className="flex items-center gap-3 px-3.5 py-3">
                    <form action={setClaimStatus}>
                      <input type="hidden" name="item_id" value={r.item_id} />
                      <input type="hidden" name="status" value={done ? "claimed" : "purchased"} />
                      <button aria-label={done ? "Mark not bought" : "Mark bought"} className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${done ? "border-ok bg-ok text-white" : "border-line"}`}>
                        {done && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="M5 12l5 5L20 7" /></svg>}
                      </button>
                    </form>
                    {img && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt="" className="h-11 w-11 rounded-lg border border-line object-cover" referrerPolicy="no-referrer" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className={`truncate font-medium ${done ? "text-muted line-through" : ""}`}>{it.name}</div>
                      <div className="flex gap-3 text-[13px] text-muted">
                        {it.kind === "idea" && <span>Your idea</span>}
                        {it.kind === "suggestion" && <span>Suggestion</span>}
                        {it.url && <a href={it.url} target="_blank" rel="noopener noreferrer" className="font-medium text-accent">Open link ↗</a>}
                      </div>
                    </div>
                    <form action={unclaimItem}>
                      <input type="hidden" name="item_id" value={r.item_id} />
                      <SubmitButton className="btn-ghost min-h-9 px-2 text-sm text-muted" pending="…">Remove</SubmitButton>
                    </form>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
