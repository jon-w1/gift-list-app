import { Header, SkeletonRows } from "@/components/Header";

export default function Loading() {
  return (
    <main className="safe-bottom">
      <Header back="/family" title={<span className="inline-block h-5 w-28 animate-pulse rounded bg-soft align-middle" />} />
      <div className="space-y-4 px-4 pt-3">
        <div className="h-9 animate-pulse rounded-xl bg-soft" />
        <div className="h-5 w-40 animate-pulse rounded bg-soft" />
        <SkeletonRows />
      </div>
    </main>
  );
}
