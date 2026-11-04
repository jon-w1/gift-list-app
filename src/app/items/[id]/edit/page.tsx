import { notFound } from "next/navigation";
import { requireMe } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { ItemForm } from "@/components/ItemForm";
import { SubmitButton } from "@/components/SubmitButton";
import { deleteItem } from "@/app/actions";
import type { Item } from "@/lib/types";

const TAB = { wish: "wishlist", suggestion: "suggestions", idea: "ideas" } as const;

export default async function EditItem({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireMe();
  const { data: item } = await supabase.from("items").select("*").eq("id", id).maybeSingle<Item>();
  if (!item) notFound();
  const back = `/p/${item.person_id}?tab=${TAB[item.kind]}`;

  return (
    <main className="safe-bottom">
      <Header back={back} title="Edit item" />
      <ItemForm
        userId={user.id}
        backHref={back}
        notesPlaceholder="Size, color, model, anything that helps"
        initial={{ id: item.id, person_id: item.person_id, kind: item.kind, name: item.name, notes: item.notes, url: item.url, image_url: item.image_url, photo_path: item.photo_path }}
      />
      <form action={deleteItem} className="px-4 pt-8">
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="back" value={back} />
        <SubmitButton className="btn-danger w-full" pending="Deleting…">Delete item</SubmitButton>
      </form>
    </main>
  );
}
