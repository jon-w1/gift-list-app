import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireMe } from "@/lib/supabase/server";
import { ITEM_SELECT, normalizeItems } from "@/lib/items";
import { Empty, Header } from "@/components/Header";
import { ItemCard } from "@/components/ItemCard";
import { AddItemSheet } from "@/components/AddItemSheet";
import type { Item, Person } from "@/lib/types";

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

  const isManager = person.managed_by === user.id;
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
    <ItemCard
      key={item.id}
      item={item}
      userId={user.id}
      canEdit={item.created_by === user.id || (item.kind === "wish" && isManager)}
      showClaims
      showCreator={item.kind === "suggestion"}
      editHref={`/items/${item.id}/edit`}
    />
  );

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
    { key: "ideas", label: "My ideas" },
  ];

  return (
    <main className="safe-bottom">
      <Header back="/family" title={person.display_name} />

      <nav className="flex gap-1 px-4 pt-3" aria-label="Lists">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.key === "list" ? `/p/${id}` : `/p/${id}?tab=${t.key}`}
            replace
            className={`flex-1 rounded-xl py-2 text-center text-[14px] font-semibold ${tab === t.key ? "bg-ink text-bg" : "text-muted active:bg-soft"}`}
            aria-current={tab === t.key ? "page" : undefined}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "list" ? (
        <div className="space-y-7 px-4 pt-4">
          <section className="space-y-3">
            <SectionHead
              title={`${first}'s wishlist`}
              count={wishes.length}
              note={isManager ? `You manage ${first}'s list, so you can add to it and shop for it.` : `Mark something bought so nobody doubles up.`}
              add={isManager ? sheet("wish", "+ Add", linkBtn) : undefined}
            />
            {wishes.length === 0 ? <Empty>{first} hasn&apos;t added anything yet.</Empty> : wishes.map(card)}
          </section>

          <section className="space-y-3">
            <SectionHead
              title="Suggestions"
              count={suggestions.length}
              note={`Ideas from family. ${first} can't see these.`}
              add={sheet("suggestion", "+ Suggest", linkBtn)}
            />
            {suggestions.length === 0 ? <Empty>No suggestions yet. Know something {first} would like?</Empty> : suggestions.map(card)}
          </section>
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
