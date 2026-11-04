"use client";

import { useEffect, useState } from "react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Android/Chrome one-tap install. iOS has no API for this, so it shows instructions instead. */
export function InstallButton() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");

  useEffect(() => {
    const ua = navigator.userAgent;
    setPlatform(/iPhone|iPad|iPod/.test(ua) || (/Mac/.test(ua) && navigator.maxTouchPoints > 1) ? "ios" : /Android/.test(ua) ? "android" : "other");
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (installed) return <p className="rounded-xl bg-ok-soft px-4 py-3 text-[15px]">✓ Gift Lists is installed on this device.</p>;
  if (evt)
    return (
      <button className="btn-primary w-full" onClick={async () => { await evt.prompt(); await evt.userChoice; setEvt(null); }}>
        Install Gift Lists
      </button>
    );
  return <p className="text-[14px] text-muted">{platform === "ios" ? "Follow the iPhone steps below." : platform === "android" ? "Follow the Android steps below." : "Open this page on your phone to install it."}</p>;
}
