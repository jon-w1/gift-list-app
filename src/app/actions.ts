"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
  revalidatePath("/");
  if (data) redirect(`/p/${data.id}`);
}

export async function deleteManagedPerson(formData: FormData) {
  const { supabase } = await uid();
  const id = str(formData.get("id"), 64);
  if (!id) return;
  await supabase.from("people").delete().eq("id", id);
  revalidatePath("/", "layout");
}

// ───────────────────────────── pairing

export type PairResult = { status: "connected" | "pending" | "self" | "invalid" | "error"; name?: string; person_id?: string; email?: string } | null;

export async function connectByEmail(_prev: PairResult, formData: FormData): Promise<PairResult> {
  const { supabase } = await uid();
  const email = str(formData.get("email"), 320) ?? "";
  const { data, error } = await supabase.rpc("connect_by_email", { target_email: email });
  if (error) return { status: "error", email };
  revalidatePath("/");
  return { ...(data as NonNullable<PairResult>), email };
}

export async function getInviteToken() {
  const { supabase } = await uid();
  const { data } = await supabase.rpc("my_invite_token");
  return data as string | null;
}

export async function acceptInvite(formData: FormData) {
  const { supabase } = await uid();
  const token = str(formData.get("token"), 64);
  const { data } = await supabase.rpc("accept_invite", { invite_token: token });
  revalidatePath("/");
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
    revalidatePath(`/p/${input.person_id}`);
    return { ok: true, id: input.id };
  }

  const { data, error } = await supabase
    .from("items")
    .insert({ ...fields, person_id: input.person_id, kind: input.kind, created_by: userId })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "Couldn't add that item." };
  revalidatePath(`/p/${input.person_id}`);
  return { ok: true, id: data.id };
}

export async function deleteItem(formData: FormData) {
  const { supabase } = await uid();
  const id = str(formData.get("id"), 64);
  const back = str(formData.get("back"), 300) ?? "/";
  if (!id) return;
  const { data: item } = await supabase.from("items").select("photo_path").eq("id", id).single();
  await supabase.from("items").delete().eq("id", id);
  if (item?.photo_path) await supabase.storage.from(PHOTO_BUCKET).remove([item.photo_path]); // best effort
  revalidatePath("/", "layout");
  redirect(back.startsWith("/") ? back : "/");
}

// ───────────────────────────── claims

export async function claimItem(formData: FormData) {
  const { supabase, userId } = await uid();
  const id = str(formData.get("item_id"), 64);
  if (!id) return;
  await supabase.from("claims").insert({ item_id: id, claimed_by: userId });
  revalidatePath("/", "layout");
}

export async function setClaimStatus(formData: FormData) {
  const { supabase } = await uid();
  const id = str(formData.get("item_id"), 64);
  const status = formData.get("status") === "purchased" ? "purchased" : "claimed";
  if (!id) return;
  await supabase.from("claims").update({ status }).eq("item_id", id);
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
