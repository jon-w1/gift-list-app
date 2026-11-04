import { requireMe } from "@/lib/supabase/server";
import { completeOnboarding } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { GiftMark } from "@/components/Header";

export const metadata = { title: "Welcome" };

export default async function Welcome({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { me } = await requireMe();
  const { next } = await searchParams;
  return (
    <main className="safe-top px-5">
      <div className="mt-16 mb-8 flex flex-col items-center text-center">
        <GiftMark size={48} />
        <h1 className="mt-4 text-2xl font-bold">Welcome!</h1>
        <p className="mt-2 text-muted">What should your family call you?</p>
      </div>
      <form action={completeOnboarding} className="space-y-3">
        <input type="hidden" name="next" value={next ?? "/"} />
        <input name="display_name" className="input" required maxLength={60} defaultValue={me.onboarded ? me.display_name : ""} placeholder="e.g. Grandma, Uncle Mike, Sarah" autoFocus />
        <SubmitButton className="btn-primary w-full">Continue</SubmitButton>
      </form>
    </main>
  );
}
