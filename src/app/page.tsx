import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMe } from "@/lib/supabase/server";
import { Avatar, Empty, GiftMark } from "@/components/Header";
import type { Person } from "@/lib/types";

export default async function Home() {
  const { supabase, user, me } = await requireMe();
  if (!me.onboarded) redirect("/welcome");

  const [{ data: people }, { data: myClaims }, { count: myWishes }] = await Promise.all([
    supabase.from("people").select("*").neq("id", me.id).order("display_name").returns<Person[]>(),
    supabase.from("claims").select("status").eq("claimed_by", user.id),
    supabase.from("items").select("id", { count: "exact", head: true }).eq("person_id", me.id).eq("kind", "wish"),
  ]);

  const managed = (people ?? []).filter((p) => p.managed_by === user.id);
  const others = (people ?? []).filter((p) => p.managed_by !== user.id);
  const toBuy = (myClaims ?? []).filter((c) => c.status === "claimed").length;
  const bought = (myClaims ?? []).length - toBuy;

  return (
    <main className="safe-bottom">
      <header className="safe-top px-5">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <GiftMark size={28} />
            <span className="text-xl font-bold tracking-tight">Gift Lists</span>
          </div>
          <Link href="/settings" aria-label="Settings" className="btn-ghost w-11 px-0">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
          </Link>
        </div>
      </header>

      <div className="space-y-7 px-4 pt-2">
        <section className="grid grid-cols-2 gap-3">
          <Link href={`/p/${me.id}`} className="card p-4 active:bg-soft">
            <div className="text-sm text-muted">My wishlist</div>
            <div className="mt-1 text-2xl font-bold">{myWishes ?? 0}</div>
            <div className="text-sm text-muted">{myWishes === 1 ? "item" : "items"}</div>
          </Link>
          <Link href="/shopping" className="card p-4 active:bg-soft">
            <div className="text-sm text-muted">Shopping list</div>
            <div className="mt-1 text-2xl font-bold">{toBuy}</div>
            <div className="text-sm text-muted">to buy{bought ? ` · ${bought} bought` : ""}</div>
          </Link>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">Family</h2>
            <Link href="/people/add" className="text-[15px] font-semibold text-accent">+ Add</Link>
          </div>
          {others.length + managed.length === 0 ? (
            <Empty>
              <p className="mb-3">No one here yet. Pair with family to see their lists.</p>
              <Link href="/people/add" className="btn-primary">Add family</Link>
            </Empty>
          ) : (
            <ul className="card divide-y divide-line overflow-hidden">
              {[...others, ...managed].map((p) => (
                <li key={p.id}>
                  <Link href={`/p/${p.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-soft">
                    <Avatar name={p.display_name} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{p.display_name}</div>
                      {p.managed_by === user.id && <div className="text-sm text-muted">Managed by you</div>}
                    </div>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted"><path d="M9 6l6 6-6 6" /></svg>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="px-1 pb-4 text-center text-sm text-muted">
          <Link href="/install" className="underline underline-offset-2">Add Gift Lists to your home screen</Link>
        </p>
      </div>
    </main>
  );
}
