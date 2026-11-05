import { notFound } from "next/navigation";
import { requireMe } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { ItemForm } from "@/components/ItemForm";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { deleteItem } from "@/app/actions";
import type { Item } from "@/lib/types";

export default async function EditItem({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, me } = await requireMe();
  const { data: item } = await supabase.from("items").select("*").eq("id", id).maybeSingle<Item>();
  if (!item) notFound();
  const back = item.person_id === me.id ? "/" : `/p/${item.person_id}${item.kind === "idea" ? "?tab=ideas" : ""}`;

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
        <ConfirmDialog
          className="btn-danger w-full" label="Delete item" title="Delete this item?"
          message={`"${item.name}" will be removed for everyone. It can't be undone.`}
          confirmLabel="Delete" pendingLabel="Deleting…"
        />
      </form>
    </main>
  );
}
