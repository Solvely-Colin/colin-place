"use client";

import { useEffect, useState } from "react";

const TZ = "America/Indiana/Indianapolis";

function status(hour: number): string {
  if (hour < 6) return "almost certainly asleep";
  if (hour < 9) return "coffee, then the notifications";
  if (hour < 12) return "deep in a PR review";
  if (hour < 13) return "lunch, probably at the desk";
  if (hour < 17) return "shipping something at the day job";
  if (hour < 20) return "off the clock";
  return "agents running, Colin watching the logs";
}

interface Snapshot {
  time: string;
  hour: number;
}

function snapshot(): Snapshot {
  const now = new Date();
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
  }).format(now);
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", hour12: false }).format(now)
  );
  return { time, hour: Number.isNaN(hour) ? 12 : hour % 24 };
}

// Colin's local time, and a guess at what he is doing. Renders empty on the
// server so the clock never disagrees with the client.
export function LocalClock({ withStatus = false, className }: { withStatus?: boolean; className?: string }) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  useEffect(() => {
    const tick = () => setSnap(snapshot());
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, []);
  if (!snap) return <span className={className} aria-hidden />;
  return (
    <span className={className} suppressHydrationWarning>
      <span className="tabular-nums">{snap.time}</span>
      <span className="text-ink-mute"> in Mishawaka</span>
      {withStatus && <span className="text-ink-dim"> · {status(snap.hour)}</span>}
    </span>
  );
}
