"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PHOTO_BUCKET, photoUrl, resizeImage } from "@/lib/photos";
import { removeItem, saveItem, type ItemInput } from "@/app/actions";
import { ConfirmDialog } from "./ConfirmDialog";

const looksLikeUrl = (s: string) => /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(s.trim());

export function ItemForm({ initial, userId, backHref, notesPlaceholder, onDone }: {
  initial: ItemInput;
  userId: string;
  backHref: string;
  notesPlaceholder: string;
  /** When set (e.g. inside a sheet), called on save/cancel instead of navigating to backHref. */
  onDone?: () => void;
}) {
  const router = useRouter();
  const [v, setV] = useState<ItemInput>(initial);
  const [fetching, setFetching] = useState(false);
  const [linkNote, setLinkNote] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetched = useRef<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (patch: Partial<ItemInput>) => setV((cur) => ({ ...cur, ...patch }));

  async function fillFromLink(raw: string) {
    const url = raw.trim();
    if (!looksLikeUrl(url) || lastFetched.current === url) return;
    lastFetched.current = url;
    setFetching(true);
    setLinkNote(null);
    try {
      const res = await fetch(`/api/unfurl?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setV((cur) => ({
        ...cur,
        url: data.url ?? cur.url,
        name: cur.name?.trim() ? cur.name : data.name ?? "",
        notes: cur.notes?.trim() ? cur.notes : data.details ?? cur.notes,
        image_url: cur.photo_path ? cur.image_url : data.image_url ?? cur.image_url,
      }));
      setLinkNote(data.name ? null : "Couldn't read that page — just type the name.");
    } catch {
      setLinkNote("Couldn't read that page — just type the name.");
    } finally {
      setFetching(false);
    }
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const blob = await resizeImage(file);
      const path = `${userId}/${crypto.randomUUID()}.jpg`;
      const { error } = await createClient().storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: "image/jpeg" });
      if (error) throw error;
      set({ photo_path: path });
    } catch {
      setError("Couldn't upload that photo. Try another one.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await saveItem(v);
    if (!res.ok) {
      setSaving(false);
      setError(res.error);
      return;
    }
    if (onDone) onDone();
    else router.replace(backHref);
    router.refresh();
  }

  async function onDelete() {
    if (!initial.id) return;
    const res = await removeItem(initial.id);
    if (!res.ok) { setError(res.error); return; }
    onDone?.();
    router.refresh();
  }

  const preview = photoUrl(v.photo_path) ?? v.image_url;

  return (
    <form onSubmit={submit} className="space-y-5 px-4 pt-4">
      <div>
        <label className="label" htmlFor="url">Link <span className="font-normal">(optional)</span></label>
        <input
          id="url" className="input" inputMode="url" autoCapitalize="none" autoCorrect="off" placeholder="Paste a link to fill this in"
          value={v.url ?? ""}
          onChange={(e) => set({ url: e.target.value })}
          onPaste={(e) => { const t = e.clipboardData.getData("text"); setTimeout(() => fillFromLink(t), 0); }}
          onBlur={(e) => fillFromLink(e.target.value)}
        />
        {/* Fixed-height status line: no layout shift, so a quick tap on "Add" never misses. */}
        <p className="mt-1.5 min-h-5 text-sm text-muted" aria-live="polite">
          {fetching ? "Looking up that link…" : linkNote ?? (v.url ? "" : "We'll fill in the name and picture for you.")}
        </p>
      </div>

      <div>
        <label className="label" htmlFor="name">Name</label>
        <input id="name" className="input" required maxLength={200} placeholder="What is it?" value={v.name} onChange={(e) => set({ name: e.target.value })} />
      </div>

      <div>
        <label className="label" htmlFor="notes">Details</label>
        <textarea
          id="notes" rows={4} maxLength={4000} className="input resize-y leading-snug" placeholder={notesPlaceholder}
          value={v.notes ?? ""} onChange={(e) => set({ notes: e.target.value })}
        />
      </div>

      <div>
        <span className="label">Photo <span className="font-normal">(optional)</span></span>
        <div className="flex items-center gap-3">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-24 w-24 rounded-xl border border-line bg-soft object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-xl border border-dashed border-line text-3xl text-muted">🎁</div>
          )}
          <div className="flex flex-col gap-2">
            <label className="btn-secondary cursor-pointer">
              {uploading ? "Uploading…" : preview ? "Change photo" : "Add photo"}
              <input ref={fileRef} type="file" accept="image/*" className="sr-only" disabled={uploading} onChange={(e) => onPhoto(e.target.files?.[0])} />
            </label>
            {preview && (
              <button type="button" className="btn-ghost min-h-9 text-sm text-muted" onClick={() => set({ photo_path: null, image_url: null })}>
                Remove photo
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-accent">{error}</p>}

      {onDone && initial.id && (
        <ConfirmDialog
          className="btn-danger w-full"
          label="Delete item"
          title="Delete this item?"
          message={`"${initial.name}" will be removed for everyone. It can't be undone.`}
          confirmLabel="Delete"
          pendingLabel="Deleting…"
          onConfirm={onDelete}
        />
      )}

      <div className={onDone
        ? "sticky bottom-0 -mx-4 flex gap-3 border-t border-line bg-bg px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)]"
        : "flex gap-3 pt-1"}>
        <button type="button" className="btn-secondary flex-1" onClick={() => (onDone ? onDone() : router.replace(backHref))}>Cancel</button>
        <button type="submit" className="btn-primary flex-[2]" disabled={saving || uploading}>
          {saving ? "Saving…" : initial.id ? "Save" : "Add"}
        </button>
      </div>
    </form>
  );
}
