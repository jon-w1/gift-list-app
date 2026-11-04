"use client";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children, className = "btn-primary", pending }: { children: React.ReactNode; className?: string; pending?: React.ReactNode }) {
  const { pending: isPending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={isPending}>
      {isPending ? pending ?? "Saving…" : children}
    </button>
  );
}
