"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** Open/close state for a slide-up sheet (mount, then slide in; slide out, then unmount). */
export function useSheet() {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const show = () => {
    setOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
  };
  const hide = () => {
    setShown(false);
    setTimeout(() => setOpen(false), 250);
  };
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && hide();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return { open, shown, show, hide };
}

/** The sheet itself: backdrop, grab handle, title, close button, scrollable body. */
export function Sheet({ sheet, title, children }: { sheet: ReturnType<typeof useSheet>; title: string; children: React.ReactNode }) {
  if (!sheet.open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-250 ${sheet.shown ? "opacity-100" : "opacity-0"}`}
        onClick={sheet.hide}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`absolute inset-x-0 bottom-0 mx-auto max-h-[92dvh] max-w-xl overflow-y-auto overscroll-contain rounded-t-3xl bg-bg shadow-2xl transition-transform duration-250 ease-out ${sheet.shown ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className="sticky top-0 z-10 bg-bg/95 backdrop-blur">
          <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-line" aria-hidden="true" />
          <div className="flex items-center gap-2 px-4 pt-2 pb-1">
            <h2 className="min-w-0 flex-1 truncate text-[17px] font-semibold">{title}</h2>
            <button type="button" onClick={sheet.hide} aria-label="Close" className="btn-ghost -mr-2 w-11 px-0 text-muted">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
