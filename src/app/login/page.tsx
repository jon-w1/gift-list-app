import { Suspense } from "react";
import { LoginForm } from "./LoginForm";
import { GiftMark } from "@/components/Header";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="safe-top flex min-h-dvh flex-col px-5">
      <div className="mt-16 mb-10 flex flex-col items-center text-center">
        <GiftMark size={56} />
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Gift List App</h1>
        <p className="mt-2 max-w-xs text-muted">Wishlists and gift ideas for family &amp; friends. No spoiled surprises.</p>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
