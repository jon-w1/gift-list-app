import Link from "next/link";

/** Sticky top bar with an in-app back button (never rely on the browser's back button). */
export function Header({ title, back, right }: { title?: React.ReactNode; back?: string; right?: React.ReactNode }) {
  return (
    <header className="safe-top sticky top-0 z-20 border-b border-line/70 bg-bg/90 backdrop-blur">
      <div className="flex h-14 items-center gap-1 px-2">
        {back ? (
          <Link href={back} aria-label="Back" className="btn-ghost -ml-0.5 w-11 px-0">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </Link>
        ) : (
          <span className="w-2" />
        )}
        <h1 className="min-w-0 flex-1 truncate text-[17px] font-semibold">{title}</h1>
        <div className="flex items-center gap-1 pr-1">{right}</div>
      </div>
    </header>
  );
}

export function GiftMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect x="8" y="24" width="48" height="34" rx="6" fill="var(--accent)" />
      <rect x="4" y="16" width="56" height="12" rx="4" fill="var(--accent)" />
      <rect x="28" y="16" width="8" height="42" fill="var(--bg)" opacity=".9" />
      <path d="M32 16c-4-9-15-11-15-4 0 4 7 4 15 4zm0 0c4-9 15-11 15-4 0 4-7 4-15 4z" fill="none" stroke="var(--accent)" strokeWidth="4" strokeLinejoin="round" />
    </svg>
  );
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const hue = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.42, background: `hsl(${hue} 42% 48%)` }}
      aria-hidden="true"
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-line px-5 py-8 text-center text-[15px] text-muted">{children}</div>;
}
