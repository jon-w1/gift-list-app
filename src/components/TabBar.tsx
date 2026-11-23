"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "My wishlist", icon: <path d="M4 11h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM3 7h18v4H3zM12 7v14M12 7c-1.5-3.5-6-4-6-1.5S9.5 7 12 7zm0 0c1.5-3.5 6-4 6-1.5S14.5 7 12 7z" /> },
  { href: "/family", label: "Family & Friends", icon: <path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 4.15a3.5 3.5 0 0 1 0 6.7" /> },
];

/** Bottom tab bar. Lives in the (tabs) layout, so it stays on screen while switching tabs. */
export function TabBar() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line/70 bg-bg/95 backdrop-blur" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="mx-auto flex max-w-xl">
        {TABS.map((t) => {
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              prefetch
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 pt-2 pb-1.5 text-[12px] font-semibold ${active ? "text-accent" : "text-muted"}`}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{t.icon}</svg>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
