import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMe } from "@/lib/supabase/server";
import { ITEM_SELECT, normalizeItems } from "@/lib/items";
import { Empty, Header } from "@/components/Header";
import { ItemCard } from "@/components/ItemCard";
import type { ItemKind, Person } from "@/lib/types";

type Tab = "wishlist" | "suggestions" | "ideas";
const TAB_KIND: Record<Tab, ItemKind> = { wishlist: "wish", suggestions: "suggestion", ideas: "idea" };

export default async function PersonPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: rawTab } = await searchParams;
  const { supabase, user, me } = await requireMe();

  const { data: person } = await supabase.from("people").select("*").eq("id", id).maybeSingle<Person>();
  if (!person) notFound();

  const isMe = person.id === me.id;
  const isManager = person.managed_by === user.id;
  const first = person.display_name.split(" ")[0];
  const tab: Tab = isMe ? "wishlist" : rawTab === "suggestions" || rawTab === "ideas" ? rawTab : "wishlist";

  let query = supabase.from("items").select(ITEM_SELECT).eq("person_id", id).eq("kind", TAB_KIND[tab]);
  if (tab === "ideas") query = query.eq("created_by", user.id);
  const { data } = await query.order("created_at", { ascending: false });
  const items = normalizeItems(data);

  const canAdd = tab === "wishlist" ? isMe || isManager : !isMe;
  const addLabel = { wishlist: "Add to wishlist", suggestions: `Suggest a gift for ${first}`, ideas: "Add a private idea" }[tab];

  const tabs: { key: Tab; label: string }[] = [
    { key: "wishlist", label: "Wishlist" },
    { key: "suggestions", label: "Suggestions" },
    { key: "ideas", label: "My ideas" },
  ];

  const blurb = isMe
    ? "Family can see this list. You'll never see what's been claimed — no spoilers."
    : {
        wishlist: isManager
          ? `You manage ${first}'s list. You can see claims, so you can shop too.`
          : `Things ${first} asked for. Claim one so nobody doubles up.`,
        suggestions: `Ideas from family that ${first} would love. ${first} can't see these.`,
        ideas: `Only you can see these.`,
      }[tab];

  return (
    <main className="safe-bottom">
      <Header back="/" title={isMe ? "My wishlist" : person.display_name} />

      {!isMe && (
        <nav className="flex gap-1 px-4 pt-3" aria-label="Lists">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={`/p/${id}?tab=${t.key}`}
              replace
              className={`flex-1 rounded-xl py-2 text-center text-[14px] font-semibold ${tab === t.key ? "bg-ink text-bg" : "text-muted active:bg-soft"}`}
              aria-current={tab === t.key ? "page" : undefined}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      )}

      <div className="space-y-3 px-4 pt-3">
        <p className="px-1 text-[14px] text-muted">{blurb}</p>

        {canAdd && (
          <Link href={`/p/${id}/new?kind=${TAB_KIND[tab]}`} className="btn-primary w-full">+ {addLabel}</Link>
        )}

        {items.length === 0 ? (
          <Empty>
            {tab === "wishlist" && (isMe ? "Your wishlist is empty. Add a few things you'd love." : `${first} hasn't added anything yet.`)}
            {tab === "suggestions" && `No suggestions yet. Know something ${first} would like?`}
            {tab === "ideas" && "Jot down gift ideas here. They stay private to you."}
          </Empty>
        ) : (
          items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              userId={user.id}
              canEdit={item.created_by === user.id || (item.kind === "wish" && (isMe || isManager))}
              showClaims={!isMe}
              showCreator={item.kind === "suggestion"}
              editHref={`/items/${item.id}/edit`}
            />
          ))
        )}
      </div>
    </main>
  );
}
