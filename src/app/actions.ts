"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PHOTO_BUCKET } from "@/lib/photos";
import type { ItemKind } from "@/lib/types";

type Result = { ok: true } | { ok: false; error: string };

async function uid() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

const str = (v: unknown, max: number) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s.slice(0, max) : null;
};
const httpUrl = (v: unknown) => {
  const s = str(v, 2000);
  if (!s) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    return /^https?:$/.test(u.protocol) ? u.toString() : null;
  } catch {
    return null;
  }
};

// ───────────────────────────── profile

export async function completeOnboarding(formData: FormData) {
  const { supabase, userId } = await uid();
  const name = str(formData.get("display_name"), 60);
  if (!name) return;
  await supabase.from("people").update({ display_name: name, onboarded: true }).eq("user_id", userId);
  redirect(str(formData.get("next"), 500)?.startsWith("/") ? String(formData.get("next")) : "/");
}

export async function renamePerson(formData: FormData) {
  const { supabase } = await uid();
  const id = str(formData.get("id"), 64);
  const name = str(formData.get("display_name"), 60);
  if (!id || !name) return;
  await supabase.from("people").update({ display_name: name }).eq("id", id);
  revalidatePath("/", "layout");
}

export async function addManagedPerson(formData: FormData) {
  const { supabase, userId } = await uid();
  const name = str(formData.get("display_name"), 60);
  if (!name) return;
  const { data } = await supabase.from("people").insert({ display_name: name, managed_by: userId }).select("id").single();
  revalidatePath("/", "layout");
  if (data) redirect(`/p/${data.id}`);
}

/**
 * "Remove person" from their page: unpair from a real account, or delete a
 * managed profile (any manager can). Then back to Family & Friends.
 */
export async function removePerson(formData: FormData) {
  const { supabase, userId } = await uid();
  const id = str(formData.get("person_id"), 64);
  if (!id) return;
  const { data: person } = await supabase.from("people").select("id, user_id").eq("id", id).maybeSingle();
  if (person?.user_id && person.user_id !== userId) {
    await supabase.rpc("remove_connection", { other_user: person.user_id });
  } else if (person && !person.user_id) {
    await supabase.from("people").delete().eq("id", id); // RLS: managers only
  }
  revalidatePath("/", "layout");
  redirect("/family");
}

/** Any manager can add someone they're paired with as a co-manager. */
export async function addManager(formData: FormData) {
  const { supabase } = await uid();
  const personId = str(formData.get("person_id"), 64);
  const userId = str(formData.get("user_id"), 64);
  if (!personId || !userId) return;
  await supabase.from("person_managers").insert({ person_id: personId, user_id: userId });
  revalidatePath("/", "layout");
}

/** Any manager can remove any manager (the database refuses to remove the last one). */
export async function removeManager(formData: FormData) {
  const { supabase } = await uid();
  const personId = str(formData.get("person_id"), 64);
  const userId = str(formData.get("user_id"), 64);
  if (!personId || !userId) return;
  await supabase.from("person_managers").delete().eq("person_id", personId).eq("user_id", userId);
  revalidatePath("/", "layout");
}

export async function deleteManagedPerson(formData: FormData) {
  const { supabase } = await uid();
  const id = str(formData.get("id"), 64);
  if (!id) return;
  await supabase.from("people").delete().eq("id", id);
  revalidatePath("/", "layout");
}

// ───────────────────────────── pairing

export type PairResult = {
  status: "connected" | "invited" | "pending" | "self" | "invalid" | "error";
  name?: string;
  person_id?: string;
  email?: string;
  invite_url?: string;
} | null;

/**
 * Find or invite by email. If they have an account you're paired instantly.
 * If not, the pairing is saved and we email them your invite link. Sending
 * creates their (not yet signed-in) account, which turns the saved pairing
 * into a real one straight away.
 */
export async function connectByEmail(_prev: PairResult, formData: FormData): Promise<PairResult> {
  const { supabase, userId } = await uid();
  const email = (str(formData.get("email"), 320) ?? "").toLowerCase();
  const { data, error } = await supabase.rpc("connect_by_email", { target_email: email });
  if (error) return { status: "error", email };
  const res = { ...(data as NonNullable<PairResult>), email };
  revalidatePath("/", "layout");
  if (res.status !== "pending") return res;

  const [{ data: token }, { data: me }] = await Promise.all([
    supabase.rpc("my_invite_token"),
    supabase.from("people").select("display_name").eq("user_id", userId).single(),
  ]);
  const h = await headers();
  const invite_url = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}/invite/${token}`;

  const admin = createAdminClient();
  if (!admin) return { ...res, invite_url };
  const { error: sendError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { inviter_name: me?.display_name ?? "Someone", invite_url },
  });
  if (sendError) return { ...res, invite_url };
  revalidatePath("/", "layout");
  return { ...res, status: "invited" };
}

export async function acceptInvite(formData: FormData) {
  const { supabase } = await uid();
  const token = str(formData.get("token"), 64);
  const { data } = await supabase.rpc("accept_invite", { invite_token: token });
  revalidatePath("/", "layout");
  const res = data as { status: string; person_id?: string } | null;
  redirect(res?.person_id ? `/p/${res.person_id}` : "/");
}

export async function removeConnection(formData: FormData) {
  const { supabase } = await uid();
  const other = str(formData.get("user_id"), 64);
  if (!other) return;
  await supabase.rpc("remove_connection", { other_user: other });
  revalidatePath("/", "layout");
}

// ───────────────────────────── items

export type ItemInput = {
  id?: string;
  person_id: string;
  kind: ItemKind;
  name: string;
  notes?: string | null;
  url?: string | null;
  image_url?: string | null;
  photo_path?: string | null;
};

export async function saveItem(input: ItemInput): Promise<Result & { id?: string }> {
  const { supabase, userId } = await uid();
  const name = str(input.name, 200);
  if (!name) return { ok: false, error: "Give it a name." };
  const fields = {
    name,
    notes: str(input.notes, 4000),
    url: httpUrl(input.url),
    image_url: httpUrl(input.image_url),
    photo_path: input.photo_path?.startsWith(`${userId}/`) || input.id ? str(input.photo_path, 300) : null,
  };

  if (input.id) {
    const { error } = await supabase.from("items").update(fields).eq("id", input.id);
    if (error) return { ok: false, error: "Couldn't save that change." };
    revalidatePath("/", "layout");
    return { ok: true, id: input.id };
  }

  const { data, error } = await supabase
    .from("items")
    .insert({ ...fields, person_id: input.person_id, kind: input.kind, created_by: userId })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "Couldn't add that item." };
  revalidatePath("/", "layout");
  return { ok: true, id: data.id };
}

async function removeItemById(supabase: Awaited<ReturnType<typeof createClient>>, id: string) {
  const { data: item } = await supabase.from("items").select("photo_path").eq("id", id).single();
  const { error } = await supabase.from("items").delete().eq("id", id);
  if (!error && item?.photo_path) await supabase.storage.from(PHOTO_BUCKET).remove([item.photo_path]); // best effort
  revalidatePath("/", "layout");
  return !error;
}

export async function deleteItem(formData: FormData) {
  const { supabase } = await uid();
  const id = str(formData.get("id"), 64);
  const back = str(formData.get("back"), 300) ?? "/";
  if (!id) return;
  await removeItemById(supabase, id);
  redirect(back.startsWith("/") ? back : "/");
}

/** Delete from inside the item sheet (no navigation). */
export async function removeItem(id: string): Promise<Result> {
  const { supabase } = await uid();
  const clean = str(id, 64);
  if (!clean) return { ok: false, error: "Couldn't delete that." };
  return (await removeItemById(supabase, clean)) ? { ok: true } : { ok: false, error: "Couldn't delete that." };
}

// ───────────────────────────── claims

export async function claimItem(formData: FormData) {
  const { supabase, userId } = await uid();
  const id = str(formData.get("item_id"), 64);
  if (!id) return;
  // One state: a claim row means "bought" (the old claimed/bought split was merged).
  await supabase.from("claims").insert({ item_id: id, claimed_by: userId, status: "purchased" });
  revalidatePath("/", "layout");
}

export async function unclaimItem(formData: FormData) {
  const { supabase } = await uid();
  const id = str(formData.get("item_id"), 64);
  if (!id) return;
  await supabase.from("claims").delete().eq("item_id", id);
  revalidatePath("/", "layout");
}

// ───────────────────────────── account

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function deleteAccount(formData: FormData) {
  if (String(formData.get("confirm")).trim().toUpperCase() !== "DELETE") return;
  const { supabase, userId } = await uid();
  // Remove this user's uploaded photos, then the account (cascades to all their data).
  const { data: files } = await supabase.storage.from(PHOTO_BUCKET).list(userId, { limit: 1000 });
  if (files?.length) await supabase.storage.from(PHOTO_BUCKET).remove(files.map((f) => `${userId}/${f.name}`));
  await supabase.rpc("delete_my_account");
  await supabase.auth.signOut();
  redirect("/login?deleted=1");
}
