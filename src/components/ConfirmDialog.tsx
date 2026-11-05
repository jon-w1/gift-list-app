"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFormStatus } from "react-dom";

/**
 * A button that opens a confirmation modal first. Confirming runs `onConfirm`, or,
 * without it, submits the surrounding <form>. Cancel, the backdrop or Escape close it.
 */
export function ConfirmDialog({ label, className, title, message, confirmLabel, pendingLabel, onConfirm }: {
  label: string;
  className: string;
  title: string;
  message: string;
  confirmLabel: string;
  pendingLabel: string;
  onConfirm?: () => Promise<unknown> | void;
}) {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const form = useFormStatus();
  const pending = busy || (!onConfirm && form.pending);

  async function confirm() {
    if (!onConfirm) return btn.current?.form?.requestSubmit();
    setBusy(true);
    try { await onConfirm(); } finally { setBusy(false); setShown(false); setOpen(false); }
  }

  function show() {
    setOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
  }
  function hide() {
    if (pending) return;
    setShown(false);
    setTimeout(() => setOpen(false), 200);
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
  });

  return (
    <>
      <button ref={btn} type="button" className={className} onClick={show}>{label}</button>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
            <div
              className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${shown ? "opacity-100" : "opacity-0"}`}
              onClick={hide}
              aria-hidden="true"
            />
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
              aria-describedby="confirm-message"
              className={`relative w-full max-w-sm rounded-2xl bg-card p-5 shadow-2xl transition duration-200 ${shown ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
            >
              <h2 id="confirm-title" className="text-[18px] font-bold">{title}</h2>
              <p id="confirm-message" className="mt-1.5 text-[15px] text-muted">{message}</p>
              <div className="mt-5 flex gap-3">
                <button type="button" className="btn-secondary flex-1" onClick={hide} disabled={pending} autoFocus>Cancel</button>
                <button
                  type="button"
                  className="btn flex-1 bg-accent text-accent-ink"
                  disabled={pending}
                  onClick={confirm}
                >
                  {pending ? pendingLabel : confirmLabel}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
