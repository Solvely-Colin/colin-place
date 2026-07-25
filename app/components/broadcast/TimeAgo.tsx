"use client";

import { useSyncExternalStore } from "react";

function format(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  const d = Math.floor(h / 24);
  return d + "d ago";
}

function subscribe(onTick: () => void) {
  const t = setInterval(onTick, 60000);
  return () => clearInterval(t);
}

// Relative timestamp that renders blank on the server (Date.now() math can
// never match across environments) and fills in at hydration.
export function TimeAgo({ iso, className }: { iso: string; className?: string }) {
  const text = useSyncExternalStore(
    subscribe,
    () => format(iso),
    () => null
  );

  return (
    <span className={className} suppressHydrationWarning>
      {text ?? " "}
    </span>
  );
}
