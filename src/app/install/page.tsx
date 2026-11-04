import { Header } from "@/components/Header";
import { InstallButton } from "./InstallButton";

export const metadata = { title: "Add to home screen" };

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent">{n}</span>
      <span className="pt-0.5 text-[15px] leading-snug">{children}</span>
    </li>
  );
}

const ShareIcon = () => (
  <svg className="inline -mt-1" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Share"><path d="M12 3v12M8 7l4-4 4 4" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></svg>
);

export default function Install() {
  return (
    <main className="safe-bottom">
      <Header back="/" title="Add to home screen" />
      <div className="space-y-6 px-4 pt-5">
        <p className="text-[15px] text-muted">Gift Lists works like an app once it&apos;s on your home screen — its own icon, full screen, and you stay signed in.</p>
        <InstallButton />

        <section className="card p-4">
          <h2 className="mb-3 font-semibold">iPhone or iPad</h2>
          <ol className="space-y-3">
            <Step n={1}>Open this site in <strong>Safari</strong>.</Step>
            <Step n={2}>Tap the <strong>Share</strong> button <ShareIcon /> (bottom of the screen, or top-right on iPad).</Step>
            <Step n={3}>Scroll down and tap <strong>Add to Home Screen</strong>.</Step>
            <Step n={4}>Tap <strong>Add</strong>. Open Gift Lists from your home screen and sign in once.</Step>
          </ol>
        </section>

        <section className="card p-4">
          <h2 className="mb-3 font-semibold">Android</h2>
          <ol className="space-y-3">
            <Step n={1}>Open this site in <strong>Chrome</strong>.</Step>
            <Step n={2}>Tap the <strong>⋮</strong> menu (top-right).</Step>
            <Step n={3}>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</Step>
          </ol>
        </section>
      </div>
    </main>
  );
}
