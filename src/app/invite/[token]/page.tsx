import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { acceptInvite } from "@/app/actions";
import { GiftMark } from "@/components/Header";
import { SubmitButton } from "@/components/SubmitButton";

export const metadata = { title: "You're invited" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Invite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const inviter = UUID.test(token) ? (await supabase.rpc("invite_preview", { invite_token: token })).data as string | null : null;
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: me } = await supabase.from("people").select("onboarded").eq("user_id", user.id).single();
    if (me && !me.onboarded) redirect(`/welcome?next=/invite/${token}`);
  }

  return (
    <main className="safe-top flex min-h-dvh flex-col items-center px-6 text-center">
      <div className="mt-20"><GiftMark size={56} /></div>
      {inviter ? (
        <>
          <h1 className="mt-5 text-2xl font-bold">{inviter} invited you</h1>
          <p className="mt-2 max-w-xs text-muted">Share wishlists and gift ideas with family &amp; friends, without spoiling surprises.</p>
          <div className="mt-8 w-full max-w-sm">
            {user ? (
              <form action={acceptInvite}>
                <input type="hidden" name="token" value={token} />
                <SubmitButton className="btn-primary w-full" pending="Pairing…">Pair with {inviter}</SubmitButton>
              </form>
            ) : (
              <Link href={`/login?next=/invite/${token}`} className="btn-primary w-full">Sign in to accept</Link>
            )}
          </div>
        </>
      ) : (
        <>
          <h1 className="mt-5 text-2xl font-bold">This invite link doesn&apos;t work</h1>
          <p className="mt-2 text-muted">Ask for a new one, or pair by email instead.</p>
          <Link href="/" className="btn-secondary mt-8">Go to Gift List App</Link>
        </>
      )}
    </main>
  );
}
