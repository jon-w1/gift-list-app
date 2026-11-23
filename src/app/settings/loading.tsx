import { Header } from "@/components/Header";

export default function Loading() {
  return (
    <main className="safe-bottom">
      <Header back="/" title="Settings" />
      <div className="space-y-4 px-4 pt-5" aria-hidden="true">
        <div className="h-5 w-28 animate-pulse rounded bg-soft" />
        <div className="h-12 animate-pulse rounded-xl bg-soft" />
        <div className="h-12 animate-pulse rounded-xl bg-soft" />
        <div className="h-40 animate-pulse rounded-2xl bg-soft" />
      </div>
    </main>
  );
}
