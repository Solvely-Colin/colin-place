"use client";

import { useEffect, useState } from "react";

// "You're one of N people here right now." Only renders when the presence
// backend is configured and someone else is actually around.
export function Presence({ className }: { className?: string }) {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    let token = "";
    try {
      token = sessionStorage.getItem("cp:visitor") ?? "";
      if (!token) {
        token = Math.random().toString(36).slice(2) + Date.now().toString(36);
        sessionStorage.setItem("cp:visitor", token);
      }
    } catch {
      token = Math.random().toString(36).slice(2);
    }
    let cancelled = false;
    const beat = async () => {
      try {
        const res = await fetch("/api/presence?t=" + encodeURIComponent(token), { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { visitors?: number; configured?: boolean };
        if (!cancelled && data.configured) setCount(data.visitors ?? 0);
      } catch {
        // Quiet.
      }
    };
    beat();
    const id = setInterval(beat, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (count < 2) return null;
  return (
    <span className={className}>
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-mint mr-1.5 align-middle" />
      {count} people here right now
    </span>
  );
}
