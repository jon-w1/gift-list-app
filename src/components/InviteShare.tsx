"use client";

import { useState } from "react";
import { shareLink } from "@/lib/native";

export function InviteShare({ url, name, label = "Share my invite link" }: { url: string; name: string; label?: string }) {
  const [note, setNote] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <button
        type="button"
        className="btn-primary w-full"
        onClick={async () => {
          const r = await shareLink(url, `${name} invited you to Gift Lists — our family wishlists.`);
          setNote(r === "copied" ? "Link copied — paste it in a text." : r === "failed" ? url : null);
        }}
      >
        {label}
      </button>
      {note && <p className="text-center text-sm break-all text-muted">{note}</p>}
    </div>
  );
}
