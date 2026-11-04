import Link from "next/link";

export default function NotFound() {
  return (
    <main className="safe-top flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="text-5xl">🎁</div>
      <h1 className="mt-4 text-xl font-bold">Nothing here</h1>
      <p className="mt-1 text-muted">This list may have been removed, or you&apos;re not paired with this person.</p>
      <Link href="/" className="btn-primary mt-6">Back home</Link>
    </main>
  );
}
