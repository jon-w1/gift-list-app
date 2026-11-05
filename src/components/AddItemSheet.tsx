"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ItemForm } from "./ItemForm";
import type { ItemInput } from "@/app/actions";
import type { ItemKind } from "@/lib/types";

type Note = { text: string; tone: "warn" | "soft" };

/**
 * A button (any content) that opens the item form in a slide-up sheet.
 * Used for adding and editing; /p/[id]/new and /items/[id]/edit still work as pages for direct links.
 */
export function ItemSheet({ children, className, ariaLabel, title, userId, notesPlaceholder, note, initial }: {
  children: React.ReactNode;
  className: string;
  ariaLabel?: string;
  title: string;
  userId: string;
  notesPlaceholder: string;
  note?: Note;
  initial: ItemInput;
}) {
  const [open, setOpen] = useState(false); // mounted
  const [shown, setShown] = useState(false); // slid up
  const [round, setRound] = useState(0); // fresh form each time

  function show() {
    setRound((r) => r + 1);
    setOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
  }
  function hide() {
    setShown(false);
    setTimeout(() => setOpen(false), 250);
  }

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

  return (
    <>
      <button type="button" className={className} onClick={show} aria-label={ariaLabel}>{children}</button>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-50">
            <div
              className={`absolute inset-0 bg-black/40 transition-opacity duration-250 ${shown ? "opacity-100" : "opacity-0"}`}
              onClick={hide}
              aria-hidden="true"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label={title}
              className={`absolute inset-x-0 bottom-0 mx-auto max-h-[92dvh] max-w-xl overflow-y-auto overscroll-contain rounded-t-3xl bg-bg shadow-2xl transition-transform duration-250 ease-out ${shown ? "translate-y-0" : "translate-y-full"}`}
            >
              <div className="sticky top-0 z-10 bg-bg/95 backdrop-blur">
                <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-line" aria-hidden="true" />
                <div className="flex items-center gap-2 px-4 pt-2 pb-1">
                  <h2 className="min-w-0 flex-1 truncate text-[17px] font-semibold">{title}</h2>
                  <button type="button" onClick={hide} aria-label="Close" className="btn-ghost -mr-2 w-11 px-0 text-muted">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                  </button>
                </div>
              </div>
              {note && (
                <p className={`mx-4 mt-1 rounded-xl px-3.5 py-2.5 text-[14px] ${note.tone === "warn" ? "bg-warn-soft" : "bg-soft"}`}>{note.text}</p>
              )}
              <ItemForm key={round} userId={userId} backHref="/" onDone={hide} notesPlaceholder={notesPlaceholder} initial={initial} />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

/** "+ Add" button that opens an empty item form in the sheet. */
export function AddItemSheet({ label, className, title, personId, kind, userId, notesPlaceholder, note }: {
  label: React.ReactNode;
  className: string;
  title: string;
  personId: string;
  kind: ItemKind;
  userId: string;
  notesPlaceholder: string;
  note?: Note;
}) {
  return (
    <ItemSheet
      className={className} title={title} userId={userId} notesPlaceholder={notesPlaceholder} note={note}
      initial={{ person_id: personId, kind, name: "", notes: "", url: "", image_url: null, photo_path: null }}
    >
      {label}
    </ItemSheet>
  );
}
