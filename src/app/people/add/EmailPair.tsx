"use client";

import Link from "next/link";
import { useActionState } from "react";
import { connectByEmail, type PairResult } from "@/app/actions";

export function EmailPair() {
  const [result, action, pending] = useActionState<PairResult, FormData>(connectByEmail, null);

  return (
    <form action={action} className="space-y-3">
      <input
        name="email" type="email" inputMode="email" autoCapitalize="none" autoComplete="off" required className="input"
        placeholder="their@email.com" defaultValue={result?.status === "connected" ? "" : result?.email}
        key={result?.status === "connected" ? result.person_id : "input"}
      />
      <button className="btn-secondary w-full" disabled={pending}>{pending ? "Looking…" : "Pair by email"}</button>
      {result?.status === "connected" && (
        <p className="rounded-xl bg-ok-soft px-3.5 py-2.5 text-[14px]" role="status">
          You&apos;re now paired with <strong>{result.name}</strong>.{" "}
          <Link href={`/p/${result.person_id}`} className="font-semibold underline">See their list</Link>
        </p>
      )}
      {result?.status === "pending" && (
        <p className="rounded-xl bg-warn-soft px-3.5 py-2.5 text-[14px]" role="status">
          No account with that email yet. You&apos;ll be paired automatically when they sign up. Send them your invite link below.
        </p>
      )}
      {result?.status === "self" && <p className="text-sm text-muted">That&apos;s your own email.</p>}
      {(result?.status === "invalid" || result?.status === "error") && <p className="text-sm text-accent">Check that email address.</p>}
    </form>
  );
}
