import { SkeletonRows } from "@/components/Header";

export default function Loading() {
  return (
    <div className="safe-top px-4">
      <div className="flex h-16 items-center px-1"><div className="h-6 w-36 animate-pulse rounded bg-soft" /></div>
      <div className="mb-3 h-11 animate-pulse rounded-xl bg-soft" />
      <SkeletonRows thumb="h-16 w-16" />
    </div>
  );
}
