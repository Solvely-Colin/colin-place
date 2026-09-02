"use client";

import { useEffect, useState } from "react";

const AEONS = ["a strange aeon ago", "before the stars were right", "when the city rose", "in March 1925", "an age ago, under the reef", "before the first commit"];

function relative(iso: string, now: number): string {
  const band = typeof window !== "undefined" ? window.__wrongness?.band ?? 0 : 0;
  if (band >= 3) {
    let h = 0;
    for (let i = 0; i < iso.length; i += 1) h = (h * 31 + iso.charCodeAt(i)) >>> 0;
    return AEONS[h % AEONS.length];
  }
  const diff = Math.max(0, now - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  const d = Math.floor(h / 24);
  if (d < 30) return d + "d ago";
  const mo = Math.floor(d / 30);
  return mo + "mo ago";
}

// Server renders a stable absolute date; the client swaps in a relative one
// after mount, so there is no hydration mismatch.
export function TimeAgo({ iso, className }: { iso: string; className?: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setText(relative(iso, Date.now()));
    tick();
    const id = setInterval(tick, 8000);
    return () => clearInterval(id);
  }, [iso]);
  return (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {text ?? iso.slice(0, 10)}
    </time>
  );
}
