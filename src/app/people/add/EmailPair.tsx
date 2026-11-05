"use client";

import Link from "next/link";
import { useActionState } from "react";
import { connectByEmail, type PairResult } from "@/app/actions";
import { InviteShare } from "@/components/InviteShare";

export function EmailPair({ myName }: { myName: string }) {
  const [result, action, pending] = useActionState<PairResult, FormData>(connectByEmail, null);
  const done = result?.status === "connected" || result?.status === "invited";

  return (
    <form action={action} className="space-y-3">
      <input
        name="email" type="email" inputMode="email" autoCapitalize="none" autoComplete="off" required className="input"
        placeholder="their@email.com" defaultValue={done ? "" : result?.email}
        key={done ? `${result?.email}-done` : "input"}
      />
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Looking…" : "Find or invite"}</button>

      {result?.status === "connected" && (
        <p className="rounded-xl bg-ok-soft px-3.5 py-2.5 text-[14px]" role="status">
          You&apos;re now paired with <strong>{result.name}</strong>.{" "}
          <Link href={`/p/${result.person_id}`} className="font-semibold underline">See their list</Link>
        </p>
      )}
      {result?.status === "invited" && (
        <p className="rounded-xl bg-ok-soft px-3.5 py-2.5 text-[14px]" role="status">
          Invite sent to <strong>{result.email}</strong>. They&apos;re in your Family &amp; Friends list now and will show up properly once they sign in.
        </p>
      )}
      {result?.status === "pending" && (
        <div className="space-y-2 rounded-xl bg-warn-soft px-3.5 py-2.5 text-[14px]" role="status">
          <p>
            Saved: you&apos;ll be paired with <strong>{result.email}</strong> as soon as they sign up, but we couldn&apos;t send the
            email. Send them your link instead:
          </p>
          {result.invite_url && <InviteShare url={result.invite_url} name={myName} label="Share my invite link" />}
        </div>
      )}
      {result?.status === "self" && <p className="text-sm text-muted">That&apos;s your own email.</p>}
      {(result?.status === "invalid" || result?.status === "error") && <p className="text-sm text-accent">Check that email address.</p>}
    </form>
  );
}
