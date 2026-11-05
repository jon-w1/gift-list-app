import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMe } from "@/lib/supabase/server";
import { Avatar, Empty, TAB_PAGE, TabBar, TopBar } from "@/components/Header";
import type { Person } from "@/lib/types";

export const metadata = { title: "Family & Friends" };

export default async function Family() {
  const { supabase, user, me } = await requireMe();
  if (!me.onboarded) redirect("/welcome");

  const [{ data: people }, { data: mine }] = await Promise.all([
    supabase.from("people").select("*").neq("id", me.id).order("display_name").returns<Person[]>(),
    supabase.from("person_managers").select("person_id").eq("user_id", user.id),
  ]);
  const managedIds = new Set((mine ?? []).map((m) => m.person_id as string));
  const managed = (people ?? []).filter((p) => managedIds.has(p.id));
  const others = (people ?? []).filter((p) => !managedIds.has(p.id));

  return (
    <main className={TAB_PAGE}>
      <TopBar title="Family & Friends" right={<Link href="/people/add" className="btn-ghost px-3 text-accent">+ Add</Link>} />

      <div className="px-4 pt-1">
        {others.length + managed.length === 0 ? (
          <Empty>
            <p className="mb-3">No one here yet. Pair with family &amp; friends to see their lists.</p>
            <Link href="/people/add" className="btn-primary">Add family &amp; friends</Link>
          </Empty>
        ) : (
          <ul className="card divide-y divide-line overflow-hidden">
            {[...others, ...managed].map((p) => (
              <li key={p.id}>
                <Link href={`/p/${p.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-soft">
                  <Avatar name={p.display_name} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{p.display_name}</div>
                    {managedIds.has(p.id) && <div className="text-sm text-muted">Managed by you</div>}
                    {p.user_id && !p.onboarded && <div className="truncate text-sm text-muted">Invited · {p.email}</div>}
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted"><path d="M9 6l6 6-6 6" /></svg>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <TabBar active="family" />
    </main>
  );
}
