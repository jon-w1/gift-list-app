"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Item picture that tries each source in turn and falls back to the gift icon.
 * Treats tiny images (Amazon's 1×1 "no image" placeholder) as missing. Also re-checks
 * after hydration, because an image can finish (or fail) before React is listening.
 */
export function Thumb({ sources, className }: { sources: string[]; className: string }) {
  const [i, setI] = useState(0);
  const ref = useRef<HTMLImageElement>(null);
  const src = sources[i];

  useEffect(() => {
    const img = ref.current;
    if (img?.complete && img.naturalWidth < 10) setI((n) => n + 1);
  }, [src]);

  if (!src) {
    return <span className={`flex items-center justify-center bg-soft text-2xl ${className}`} aria-hidden="true">🎁</span>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      key={src}
      src={src}
      alt=""
      className={`border border-line bg-soft object-cover ${className}`}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setI((n) => n + 1)}
      onLoad={(e) => { if (e.currentTarget.naturalWidth < 10) setI((n) => n + 1); }}
    />
  );
}
