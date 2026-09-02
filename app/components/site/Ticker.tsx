"use client";

import { useEffect, useState } from "react";
import type { FeedItem } from "../../lib/activity";
import { TimeAgo } from "./TimeAgo";

const KIND_DOT: Record<string, string> = {
  push: "bg-push",
  merge: "bg-merge",
  pr: "bg-mint",
  review: "bg-butter",
  issue: "bg-rose-400",
  create: "bg-teal-300",
  release: "bg-loop",
  site: "bg-violet-300",
};

// The wire, as a ticker tape. Server-seeded; refreshes itself every minute.
export function Ticker({ initialItems }: { initialItems: FeedItem[] }) {
  const [items, setItems] = useState<FeedItem[]>(initialItems);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const res = await fetch("/api/feed");
        if (!res.ok) return;
        const data: { items?: FeedItem[] } = await res.json();
        if (!cancelled && data.items && data.items.length > 0) setItems(data.items);
      } catch {
        // Keep the last good tape.
      }
    };
    const id = setInterval(refresh, 60000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const tape = items.slice(0, 16);
  if (tape.length === 0) {
    return (
      <div className="border-t border-line py-3 text-center text-[12px] font-mono text-ink-mute">
        the wire is quiet · GitHub is not answering · it will come back
      </div>
    );
  }

  const duration = Math.max(40, tape.length * 6);

  return (
    <div className="marquee-track relative border-t border-line overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-ground to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-ground to-transparent z-10" />
      <div className="marquee py-3" style={{ ["--marquee-duration" as string]: duration + "s" }}>
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0" aria-hidden={copy === 1}>
            <span className="flex items-center gap-2 px-6 font-mono text-[12px] text-loop uppercase tracking-[0.18em]">
              <span className="live-dot" /> <span data-mut={copy === 0 ? "ticker-label" : undefined}>On the wire</span>
            </span>
            {tape.map((item) => (
              <a
                key={copy + item.id}
                href={item.url ?? "https://github.com/Solvely-Colin"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-6 text-[13px] text-ink-dim hover:text-ink whitespace-nowrap transition"
                tabIndex={copy === 1 ? -1 : 0}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${KIND_DOT[item.kind] ?? "bg-loop"}`} />
                <span>{item.text}</span>
                <TimeAgo iso={item.at} className="font-mono text-[11px] text-ink-mute" />
              </a>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
