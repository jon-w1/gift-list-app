export default function Loading() {
  return (
    <div className="safe-top px-4" aria-hidden="true">
      <div className="flex h-16 items-center px-1"><div className="h-6 w-44 animate-pulse rounded bg-soft" /></div>
      <div className="card divide-y divide-line overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="h-10 w-10 animate-pulse rounded-full bg-soft" />
            <div className="h-4 w-40 animate-pulse rounded bg-soft" />
          </div>
        ))}
      </div>
    </div>
  );
}
