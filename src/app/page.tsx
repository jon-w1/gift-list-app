import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMe } from "@/lib/supabase/server";
import { ITEM_SELECT, normalizeItems } from "@/lib/items";
import { Empty, TAB_PAGE, TabBar, TopBar } from "@/components/Header";
import { OwnItemCard } from "@/components/ItemCard";
import { AddItemSheet } from "@/components/AddItemSheet";

/** Home = my own wishlist. Bought status is never shown here (and the database hides it anyway). */
export default async function Home() {
  const { supabase, user, me } = await requireMe();
  if (!me.onboarded) redirect("/welcome");

  const { data } = await supabase
    .from("items")
    .select(ITEM_SELECT)
    .eq("person_id", me.id)
    .eq("kind", "wish")
    .order("created_at", { ascending: false });
  const items = normalizeItems(data);

  return (
    <main className={TAB_PAGE}>
      <TopBar
        title="My wishlist"
        right={
          // Hidden once opened from the home screen (already installed).
          <Link href="/install" className="btn-ghost min-h-9 gap-1.5 px-2.5 text-[14px] text-accent [@media(display-mode:standalone)]:hidden">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>
            Install App
          </Link>
        }
      />

      <div className="space-y-3 px-4 pt-1">
        <p className="px-1 text-[14px] text-muted">Family can see this list. You&apos;ll never see what&apos;s been bought — no spoilers.</p>
        <AddItemSheet
          label="+ Add to wishlist" className="btn-primary w-full" title="Add to my wishlist"
          personId={me.id} kind="wish" userId={user.id} notesPlaceholder="Size, color, model, anything that helps"
        />

        {items.length === 0 ? (
          <Empty>Your wishlist is empty. Add a few things you&apos;d love.</Empty>
        ) : (
          items.map((item) => (
            <OwnItemCard key={item.id} item={item} editHref={`/items/${item.id}/edit`} />
          ))
        )}
      </div>

      <TabBar active="home" />
    </main>
  );
}
