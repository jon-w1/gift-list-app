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
          <GiftMark size={28} />
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

/** Bottom tab bar: My wishlist (home) and Family. */
export function TabBar({ active }: { active: "home" | "family" }) {
  const tabs = [
    { key: "home", href: "/", label: "My wishlist", icon: <path d="M4 11h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM3 7h18v4H3zM12 7v14M12 7c-1.5-3.5-6-4-6-1.5S9.5 7 12 7zm0 0c1.5-3.5 6-4 6-1.5S14.5 7 12 7z" /> },
    { key: "family", href: "/family", label: "Family", icon: <path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 4.15a3.5 3.5 0 0 1 0 6.7" /> },
  ] as const;
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line/70 bg-bg/95 backdrop-blur" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="mx-auto flex max-w-xl">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            aria-current={active === t.key ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-0.5 pt-2 pb-1.5 text-[12px] font-semibold ${active === t.key ? "text-accent" : "text-muted"}`}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{t.icon}</svg>
            {t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

/** Bottom padding for pages that show the TabBar. */
export const TAB_PAGE = "pb-[calc(env(safe-area-inset-bottom)+5.5rem)]";

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
