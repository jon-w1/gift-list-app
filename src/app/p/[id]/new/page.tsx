import { notFound } from "next/navigation";
import { requireMe } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { ItemForm } from "@/components/ItemForm";
import type { ItemKind, Person } from "@/lib/types";

export default async function NewItem({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kind?: string }>;
}) {
  const { id } = await params;
  const { kind: k } = await searchParams;
  const kind: ItemKind = k === "suggestion" || k === "idea" ? k : "wish";
  const { supabase, user } = await requireMe();
  const { data: person } = await supabase.from("people").select("*").eq("id", id).maybeSingle<Person>();
  if (!person) notFound();

  const first = person.display_name.split(" ")[0];
  const isMe = person.user_id === user.id;
  const title = { wish: isMe ? "Add to my wishlist" : `Add to ${first}'s wishlist`, suggestion: `Suggest for ${first}`, idea: `Idea for ${first}` }[kind];
  const back = isMe ? "/" : `/p/${id}${kind === "idea" ? "?tab=ideas" : ""}`;

  return (
    <main className="safe-bottom">
      <Header back={back} title={title} />
      {kind === "suggestion" && (
        <p className="mx-4 mt-3 rounded-xl bg-warn-soft px-3.5 py-2.5 text-[14px]">Everyone except {first} will see this suggestion.</p>
      )}
      {kind === "idea" && (
        <p className="mx-4 mt-3 rounded-xl bg-soft px-3.5 py-2.5 text-[14px]">Only you will see this idea.</p>
      )}
      <ItemForm
        userId={user.id}
        backHref={back}
        notesPlaceholder={kind === "wish" ? "Size, color, model, anything that helps" : `Size, color, why ${first} would love it`}
        initial={{ person_id: id, kind, name: "", notes: "", url: "", image_url: null, photo_path: null }}
      />
    </main>
  );
}
