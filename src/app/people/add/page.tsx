import { headers } from "next/headers";
import { requireMe } from "@/lib/supabase/server";
import { getInviteToken, addManagedPerson } from "@/app/actions";
import { Header } from "@/components/Header";
import { InviteShare } from "@/components/InviteShare";
import { SubmitButton } from "@/components/SubmitButton";
import { EmailPair } from "./EmailPair";

export const metadata = { title: "Add family" };

export default async function AddPeople() {
  const { me } = await requireMe();
  const token = await getInviteToken();
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;

  return (
    <main className="safe-bottom">
      <Header back="/family" title="Add family" />
      <div className="space-y-8 px-4 pt-5">
        <section>
          <h2 className="font-semibold">Pair by email</h2>
          <p className="mt-0.5 mb-3 text-[14px] text-muted">You&apos;ll see each other&apos;s lists right away.</p>
          <EmailPair />
        </section>

        <section>
          <h2 className="font-semibold">Send an invite link</h2>
          <p className="mt-0.5 mb-3 text-[14px] text-muted">Anyone who opens it and signs in is paired with you.</p>
          {token && <InviteShare url={`${origin}/invite/${token}`} name={me.display_name} />}
        </section>

        <section>
          <h2 className="font-semibold">Add someone without an account</h2>
          <p className="mt-0.5 mb-3 text-[14px] text-muted">For kids or grandparents. You manage their wishlist; everyone you&apos;re paired with can see it.</p>
          <form action={addManagedPerson} className="flex gap-2">
            <input name="display_name" required maxLength={60} className="input" placeholder="Name" />
            <SubmitButton className="btn-secondary shrink-0" pending="Adding…">Add</SubmitButton>
          </form>
        </section>
      </div>
    </main>
  );
}
