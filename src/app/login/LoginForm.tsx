"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Email + one-time code. Deliberately no magic links (they open in Safari,
 * not an installed app/WebView) and no Google sign-in (blocked in WebViews).
 */
export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next")?.startsWith("/") ? params.get("next")! : "/";
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(params.get("deleted") ? "Your account was deleted." : null);
  const supabase = createClient();

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) setError(error.status === 429 ? "Too many tries — wait a minute and try again." : "Couldn't send a code. Check the email address.");
    else setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    if (error) {
      setBusy(false);
      setError("That code didn't work. Check it, or send a new one.");
      return;
    }
    router.replace(next);
    router.refresh();
  }

  if (step === "email")
    return (
      <form onSubmit={sendCode} className="space-y-3">
        <label className="label" htmlFor="email">Email</label>
        <input
          id="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" required
          className="input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)}
        />
        {error && <p className="text-sm text-accent">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? "Sending…" : "Email me a code"}</button>
        <p className="pt-2 text-center text-sm text-muted">New here? Same button — we&apos;ll set you up.</p>
      </form>
    );

  return (
    <form onSubmit={verify} className="space-y-3">
      <p className="text-[15px]">We sent a code to <strong>{email}</strong>.</p>
      <label className="label" htmlFor="code">Code</label>
      <input
        id="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={10} required autoFocus
        className="input text-center text-2xl tracking-[.4em]" placeholder="••••••" value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
      />
      {error && <p className="text-sm text-accent">{error}</p>}
      <button className="btn-primary w-full" disabled={busy || code.length < 6}>{busy ? "Checking…" : "Sign in"}</button>
      <button type="button" className="btn-ghost w-full text-muted" onClick={() => { setStep("email"); setCode(""); setError(null); }}>
        Use a different email
      </button>
    </form>
  );
}
