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

const GEAR = "M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z";

/** Top bar for the two main tabs (no back button: these are the app's roots). */
export function TopBar({ title, right }: { title: React.ReactNode; right?: React.ReactNode }) {
  return (
    <header className="safe-top px-5">
      <div className="flex h-16 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="shrink-0 max-[359px]:hidden"><GiftMark size={28} /></span>
          <h1 className="truncate text-xl font-bold tracking-tight">{title}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {right}
          <Link href="/settings" aria-label="Settings" className="btn-ghost -mr-2 w-11 px-0">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3" /><path d={GEAR} /></svg>
          </Link>
        </div>
      </div>
    </header>
  );
}

/** "Install App" header link. Hidden once the app is opened from the home screen (already installed). */
export function InstallLink() {
  return (
    <Link href="/install" className="btn-ghost min-h-9 gap-1.5 px-2.5 text-[14px] text-accent [@media(display-mode:standalone)]:hidden">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>
      Install App
    </Link>
  );
}

/** Bottom padding for pages that show the TabBar. */
export const TAB_PAGE = "pb-[calc(env(safe-area-inset-bottom)+5.5rem)]";

/** Grey placeholder shown instantly while a page loads. */
export function SkeletonRows({ count = 5, thumb = "h-14 w-14" }: { count?: number; thumb?: string }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card flex items-center gap-3 p-2.5">
          <div className={`${thumb} shrink-0 animate-pulse rounded-xl bg-soft`} />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-3/4 animate-pulse rounded bg-soft" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-soft" />
          </div>
        </div>
      ))}
    </div>
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
