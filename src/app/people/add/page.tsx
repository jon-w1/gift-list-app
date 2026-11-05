import { requireMe } from "@/lib/supabase/server";
import { addManagedPerson } from "@/app/actions";
import { Header } from "@/components/Header";
import { SubmitButton } from "@/components/SubmitButton";
import { EmailPair } from "./EmailPair";

export const metadata = { title: "Add family & friends" };

export default async function AddPeople() {
  const { me } = await requireMe();

  return (
    <main className="safe-bottom">
      <Header back="/family" title="Add family & friends" />
      <div className="space-y-8 px-4 pt-5">
        <section>
          <h2 className="font-semibold">Find or invite by email</h2>
          <p className="mt-0.5 mb-3 text-[14px] text-muted">
            If they&apos;re already here, you&apos;re paired right away. If not, we&apos;ll email them an invite.
          </p>
          <EmailPair myName={me.display_name} />
        </section>

        <section>
          <h2 className="font-semibold">Add a child or other profile</h2>
          <p className="mt-0.5 mb-3 text-[14px] text-muted">For someone who won&apos;t sign in, like kids or grandparents. You manage their wishlist; everyone you&apos;re paired with can see it.</p>
          <form action={addManagedPerson} className="flex gap-2">
            <input name="display_name" required maxLength={60} className="input" placeholder="Name" />
            <SubmitButton className="btn-secondary shrink-0" pending="Adding…">Add</SubmitButton>
          </form>
        </section>
      </div>
    </main>
  );
}
