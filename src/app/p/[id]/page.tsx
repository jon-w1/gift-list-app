import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireMe } from "@/lib/supabase/server";
import { ITEM_SELECT, normalizeItems } from "@/lib/items";
import { Empty, Header } from "@/components/Header";
import { ItemRow } from "@/components/ItemRow";
import { AddItemSheet } from "@/components/AddItemSheet";
import { SubmitButton } from "@/components/SubmitButton";
import { addManager, removeManager, removePerson } from "@/app/actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { Item, Person } from "@/lib/types";
import { birthdayLine } from "@/lib/birthday";

type Tab = "list" | "ideas";

export default async function PersonPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: rawTab } = await searchParams;
  const { supabase, user, me } = await requireMe();

  // Your own list lives on the home tab.
  if (id === me.id) redirect("/");

  const { data: person } = await supabase.from("people").select("*").eq("id", id).maybeSingle<Person>();
  if (!person) notFound();

  // Managed profiles (kids etc.) can have several managers; anyone of them can edit.
  const isManaged = !person.user_id;
  const { data: managerRows } = isManaged
    ? await supabase.from("person_managers").select("user_id").eq("person_id", id)
    : { data: [] as { user_id: string }[] };
  const managerIds = (managerRows ?? []).map((m) => m.user_id as string);
  const isManager = managerIds.includes(user.id);
  const first = person.display_name.split(" ")[0];
  const tab: Tab = rawTab === "ideas" ? "ideas" : "list";

  const base = () => supabase.from("items").select(ITEM_SELECT).eq("person_id", id).order("created_at", { ascending: false });
  let wishes: Item[] = [];
  let suggestions: Item[] = [];
  let ideas: Item[] = [];
  if (tab === "list") {
    // The database only returns suggestions to people other than the recipient.
    const { data } = await base().in("kind", ["wish", "suggestion"]);
    const all = normalizeItems(data);
    wishes = all.filter((i) => i.kind === "wish");
    suggestions = all.filter((i) => i.kind === "suggestion");
  } else {
    const { data } = await base().eq("kind", "idea").eq("created_by", user.id);
    ideas = normalizeItems(data);
  }

  const card = (item: Item) => (
    <ItemRow
      key={item.id}
      item={item}
      userId={user.id}
      canEdit={item.created_by === user.id || (item.kind === "wish" && isManager)}
      showCreator={item.kind === "suggestion"}
    />
  );
  // Still-needed items first, bought ones sink to the bottom.
  const byNeeded = (a: Item, b: Item) => Number(!!a.claim) - Number(!!b.claim);
  wishes.sort(byNeeded);
  suggestions.sort(byNeeded);
  ideas.sort(byNeeded);

  const sheet = (kind: "wish" | "suggestion" | "idea", label: string, className: string) => (
    <AddItemSheet
      label={label}
      className={className}
      title={{ wish: `Add to ${first}'s wishlist`, suggestion: `Suggest for ${first}`, idea: `Idea for ${first}` }[kind]}
      personId={id}
      kind={kind}
      userId={user.id}
      notesPlaceholder={kind === "wish" ? "Size, color, model, anything that helps" : `Size, color, why ${first} would love it`}
      note={kind === "suggestion" ? { text: `Everyone except ${first} will see this suggestion.`, tone: "warn" }
        : kind === "idea" ? { text: "Only you will see this idea.", tone: "soft" } : undefined}
    />
  );
  const linkBtn = "-mr-2 rounded-lg px-2 py-1 text-[15px] font-semibold text-accent active:bg-soft";

  const tabs: { key: Tab; label: string }[] = [
    { key: "list", label: "Wishlist" },
    { key: "ideas", label: `Your notepad for ${first}` },
  ];

  return (
    <main className="safe-bottom">
      <Header back="/family" title={person.display_name} />
      {person.birthday && (
        <p className="px-5 pt-3 text-[14px] font-medium text-muted">🎂 {birthdayLine(person.birthday, isManaged)}</p>
      )}

      <nav className="flex gap-1 px-4 pt-3" aria-label="Lists">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.key === "list" ? `/p/${id}` : `/p/${id}?tab=${t.key}`}
            replace
            className={`flex flex-1 items-center justify-center rounded-xl px-2 py-2 text-center text-[14px] leading-tight font-semibold ${tab === t.key ? "bg-ink text-bg" : "text-muted active:bg-soft"}`}
            aria-current={tab === t.key ? "page" : undefined}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "list" ? (
        <div className="space-y-7 px-4 pt-4">
          <section className="space-y-2">
            <SectionHead
              title={`${first}'s wishlist`}
              count={wishes.length}
              note={isManager ? `You manage ${first}'s list, so you can add to it and shop for it.` : `Mark something bought so nobody doubles up.`}
              add={isManager ? sheet("wish", "+ Add", linkBtn) : undefined}
            />
            {wishes.length === 0 ? <Empty>{first} hasn&apos;t added anything yet.</Empty> : wishes.map(card)}
          </section>

          <section className="space-y-2">
            <SectionHead
              title="Suggestions"
              count={suggestions.length}
              note={`Ideas from family & friends. ${first} can't see these.`}
              add={sheet("suggestion", "+ Suggest", linkBtn)}
            />
            {suggestions.length === 0 ? <Empty>No suggestions yet. Know something {first} would like?</Empty> : suggestions.map(card)}
          </section>

          {isManaged && isManager && <Managers personId={id} first={first} managerIds={managerIds} userId={user.id} />}

          {(!isManaged || isManager) && (
            <form action={removePerson} className="border-t border-line pt-5 pb-4">
              <input type="hidden" name="person_id" value={id} />
              <ConfirmDialog
                className="btn-danger w-full"
                label="Remove person"
                title={isManaged ? `Delete ${first}'s profile?` : `Remove ${first}?`}
                message={isManaged
                  ? `This deletes ${first}'s profile and wishlist for every manager. It can't be undone.`
                  : `You'll be unpaired and stop seeing each other's lists. Nothing is deleted, and you can pair again any time.`}
                confirmLabel={isManaged ? "Delete" : "Remove"}
                pendingLabel="Removing…"
              />
            </form>
          )}
        </div>
      ) : (
        <div className="space-y-3 px-4 pt-4">
          <p className="px-1 text-[14px] text-muted">Only you can see these.</p>
          {sheet("idea", "+ Add a private idea", "btn-primary w-full")}
          {ideas.length === 0 ? <Empty>Jot down gift ideas here. They stay private to you.</Empty> : ideas.map(card)}
        </div>
      )}
    </main>
  );
}

function SectionHead({ title, count, note, add }: { title: string; count: number; note: string; add?: React.ReactNode }) {
  return (
    <div className="px-1">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[17px] font-bold">
          {title} <span className="font-semibold text-muted">· {count}</span>
        </h2>
        {add}
      </div>
      <p className="text-[14px] text-muted">{note}</p>
    </div>
  );
}

/** Managers of a kid/managed profile: list, remove (never the last), add from people you're paired with. */
async function Managers({ personId, first, managerIds, userId }: { personId: string; first: string; managerIds: string[]; userId: string }) {
  const { supabase } = await requireMe();
  const { data: conns } = await supabase.from("connections").select("user_a, user_b");
  const pairedIds = (conns ?? []).map((c) => (c.user_a === userId ? c.user_b : c.user_a));
  const ids = [...new Set([...managerIds, ...pairedIds])];
  const { data: people } = ids.length
    ? await supabase.from("people").select("user_id, display_name").in("user_id", ids).returns<{ user_id: string; display_name: string }[]>()
    : { data: [] as { user_id: string; display_name: string }[] };
  const nameOf = (uid: string) => (uid === userId ? "You" : people?.find((p) => p.user_id === uid)?.display_name ?? "Someone");
  const candidates = (people ?? []).filter((p) => pairedIds.includes(p.user_id) && !managerIds.includes(p.user_id))
    .sort((a, b) => a.display_name.localeCompare(b.display_name));
  const canRemove = managerIds.length > 1;

  return (
    <section className="space-y-3">
      <div className="px-1">
        <h2 className="text-[17px] font-bold">Managers <span className="font-semibold text-muted">· {managerIds.length}</span></h2>
        <p className="text-[14px] text-muted">Managers can edit {first}&apos;s wishlist. Anyone paired with a manager can see and shop it.</p>
      </div>
      <ul className="card divide-y divide-line overflow-hidden">
        {[...managerIds].sort((a, b) => (a === userId ? -1 : b === userId ? 1 : nameOf(a).localeCompare(nameOf(b)))).map((m) => (
          <li key={m} className="flex items-center gap-3 px-3.5 py-2.5">
            <span className="min-w-0 flex-1 truncate">{nameOf(m)}</span>
            {canRemove && (
              <form action={removeManager}>
                <input type="hidden" name="person_id" value={personId} />
                <input type="hidden" name="user_id" value={m} />
                <SubmitButton className="btn-ghost min-h-9 px-2 text-sm text-muted" pending="…">{m === userId ? "Leave" : "Remove"}</SubmitButton>
              </form>
            )}
          </li>
        ))}
      </ul>
      {candidates.length > 0 ? (
        <form action={addManager} className="flex gap-2">
          <input type="hidden" name="person_id" value={personId} />
          <select name="user_id" required className="input py-2" defaultValue="">
            <option value="" disabled>Choose someone you&apos;re paired with</option>
            {candidates.map((c) => <option key={c.user_id} value={c.user_id}>{c.display_name}</option>)}
          </select>
          <SubmitButton className="btn-secondary min-h-11 shrink-0" pending="Adding…">Add</SubmitButton>
        </form>
      ) : (
        <p className="px-1 text-[14px] text-muted">To add another manager, pair with them first in Family &amp; Friends.</p>
      )}
    </section>
  );
}
