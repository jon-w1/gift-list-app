import Link from "next/link";
import { requireMe } from "@/lib/supabase/server";
import { deleteAccount, deleteManagedPerson, removeConnection, renamePerson, signOut } from "@/app/actions";
import { Avatar, Header } from "@/components/Header";
import { SubmitButton } from "@/components/SubmitButton";
import type { Person } from "@/lib/types";

export const metadata = { title: "Settings" };

const today = () => new Date().toISOString().slice(0, 10);

export default async function Settings() {
  const { supabase, user, me } = await requireMe();
  const [{ data: conns }, { data: mine }] = await Promise.all([
    supabase.from("connections").select("user_a, user_b"),
    supabase.from("person_managers").select("person_id").eq("user_id", user.id),
  ]);
  const managedIds = (mine ?? []).map((m) => m.person_id as string);
  const { data: managed } = managedIds.length
    ? await supabase.from("people").select("*").in("id", managedIds).order("display_name").returns<Person[]>()
    : { data: [] as Person[] };
  const otherIds = (conns ?? []).map((c) => (c.user_a === user.id ? c.user_b : c.user_a));
  const { data: paired } = otherIds.length
    ? await supabase.from("people").select("*").in("user_id", otherIds).order("display_name").returns<Person[]>()
    : { data: [] as Person[] };

  return (
    <main className="safe-bottom">
      <Header back="/" title="Settings" />
      <div className="space-y-8 px-4 pt-5">
        <section>
          <h2 className="mb-2 font-semibold">Your profile</h2>
          <form action={renamePerson} className="space-y-3">
            <input type="hidden" name="id" value={me.id} />
            <div>
              <label className="label" htmlFor="me-name">Name</label>
              <input id="me-name" name="display_name" required maxLength={60} defaultValue={me.display_name} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="me-birthday">Birthday <span className="font-normal">(optional, people you&apos;re paired with see month &amp; day only)</span></label>
              <input id="me-birthday" name="birthday" type="date" max={today()} defaultValue={me.birthday ?? ""} className="input" />
            </div>
            <SubmitButton className="btn-secondary w-full">Save</SubmitButton>
          </form>
          <p className="mt-1.5 px-1 text-sm text-muted">Signed in as {me.email}</p>
        </section>

        {!!managed?.length && (
          <section>
            <h2 className="mb-2 font-semibold">People you manage</h2>
            <ul className="card divide-y divide-line">
              {managed.map((p) => (
                <li key={p.id} className="space-y-2 p-3.5">
                  <form action={renamePerson} className="space-y-2">
                    <input type="hidden" name="id" value={p.id} />
                    <input name="display_name" required maxLength={60} defaultValue={p.display_name} className="input py-2" aria-label={`${p.display_name}'s name`} />
                    <div className="flex items-center gap-2">
                      <label className="shrink-0 text-sm text-muted" htmlFor={`bday-${p.id}`}>Birthday</label>
                      <input id={`bday-${p.id}`} name="birthday" type="date" max={today()} defaultValue={p.birthday ?? ""} className="input py-2" />
                      <SubmitButton className="btn-secondary min-h-10 shrink-0">Save</SubmitButton>
                    </div>
                  </form>
                  <form action={deleteManagedPerson}>
                    <input type="hidden" name="id" value={p.id} />
                    <SubmitButton className="text-sm font-medium text-accent" pending="Removing…">Remove {p.display_name} and their list</SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="mb-2 font-semibold">Paired with</h2>
          {!paired?.length ? (
            <p className="text-[15px] text-muted">No one yet. <Link href="/people/add" className="font-semibold text-accent">Add family &amp; friends</Link></p>
          ) : (
            <ul className="card divide-y divide-line">
              {paired.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-3.5 py-2.5">
                  <Avatar name={p.display_name} size={34} />
                  <span className="min-w-0 flex-1 truncate">{p.display_name}</span>
                  <form action={removeConnection}>
                    <input type="hidden" name="user_id" value={p.user_id!} />
                    <SubmitButton className="btn-ghost min-h-9 px-2 text-sm text-muted" pending="…">Unpair</SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-2">
          <Link href="/install" className="btn-secondary w-full">Add to home screen</Link>
          <form action={signOut}><SubmitButton className="btn-secondary w-full" pending="Signing out…">Sign out</SubmitButton></form>
        </section>

        <details className="card p-4">
          <summary className="cursor-pointer font-semibold text-accent">Delete my account</summary>
          <p className="mt-2 text-[14px] text-muted">
            Permanently deletes your account, your wishlist, suggestions and ideas you&apos;ve written, what you&apos;ve marked bought, and anyone you manage. Type DELETE to confirm.
          </p>
          <form action={deleteAccount} className="mt-3 flex gap-2">
            <input name="confirm" required className="input py-2" placeholder="DELETE" autoCapitalize="characters" autoComplete="off" />
            <SubmitButton className="btn-danger min-h-10 shrink-0" pending="Deleting…">Delete</SubmitButton>
          </form>
        </details>
      </div>
    </main>
  );
}
