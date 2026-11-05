"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

/** Submit button that needs a second tap ("Tap again to …") before it submits. */
export function ConfirmSubmit({ label, confirmLabel, pendingLabel, className }: {
  label: string;
  confirmLabel: string;
  pendingLabel: string;
  className: string;
}) {
  const [armed, setArmed] = useState(false);
  const { pending } = useFormStatus();
  return (
    <button
      type={armed ? "submit" : "button"}
      className={className}
      disabled={pending}
      onClick={(e) => { if (!armed) { e.preventDefault(); setArmed(true); } }}
    >
      {pending ? pendingLabel : armed ? confirmLabel : label}
    </button>
  );
}
