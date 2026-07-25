"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "colin-os-visitor-id";
const BEAT_INTERVAL_MS = 30000;

interface PresenceResponse {
  visitors?: number;
  configured?: boolean;
}

function getVisitorId(): string {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function Presence() {
  const [visitors, setVisitors] = useState<number | null>(null);

  useEffect(() => {
    const id = getVisitorId();
    let cancelled = false;

    async function beat() {
      try {
        const res = await fetch(`/api/presence?t=${encodeURIComponent(id)}`, {
          cache: "no-store",
        });
        const data = (await res.json()) as PresenceResponse;
        if (cancelled) return;
        if (data.configured && typeof data.visitors === "number" && data.visitors > 0) {
          setVisitors(data.visitors);
        } else {
          setVisitors(null);
        }
      } catch {
        if (!cancelled) setVisitors(null);
      }
    }

    beat();
    const t = setInterval(beat, BEAT_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  // Render nothing until the first successful beat — avoids hydration
  // mismatch and keeps the pill hidden when presence is not configured.
  if (visitors === null) return null;

  return (
    <div className="fixed bottom-24 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/25 backdrop-blur-md border border-white/40 shadow-lg">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
      </span>
      <span className="text-xs font-medium text-stone-700">
        {visitors} here now
      </span>
    </div>
  );
}
