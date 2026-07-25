"use client";

import { useEffect, useState } from "react";
import {
  ArrowUpCircle,
  CircleDot,
  Eye,
  GitMerge,
  GitPullRequest,
  PackagePlus,
  Radio,
  Sparkles,
  Tag,
} from "lucide-react";
import type { FeedItem } from "../../lib/activity";
import { TimeAgo } from "./TimeAgo";

const KIND_ICON: Record<string, typeof Radio> = {
  push: ArrowUpCircle,
  merge: GitMerge,
  pr: GitPullRequest,
  review: Eye,
  issue: CircleDot,
  create: PackagePlus,
  release: Tag,
  site: Sparkles,
};

const KIND_COLOR: Record<string, string> = {
  push: "text-sky-600",
  merge: "text-purple-600",
  pr: "text-emerald-600",
  review: "text-amber-600",
  issue: "text-rose-600",
  create: "text-teal-600",
  release: "text-orange-600",
  site: "text-violet-600",
};

interface WireProps {
  initialItems: FeedItem[];
}

// The raw signal: Colin's live public activity, server-seeded and then
// refreshed in the browser every minute.
export function Wire({ initialItems }: WireProps) {
  const [items, setItems] = useState<FeedItem[]>(initialItems);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const res = await fetch("/api/feed");
        if (!res.ok) return;
        const data: { items?: FeedItem[] } = await res.json();
        if (!cancelled && data.items && data.items.length > 0) {
          setItems(data.items);
        }
      } catch {
        // Keep showing the last good feed.
      }
    };
    const interval = setInterval(refresh, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (items.length === 0) {
    return (
      <p className="text-sm text-stone-600 italic">
        The wire is quiet right now — GitHub isn&apos;t answering. It&apos;ll come back.
      </p>
    );
  }

  return (
    <ul className="space-y-1">
      {items.slice(0, 8).map((item) => {
        const Icon = KIND_ICON[item.kind] ?? Radio;
        const row = (
          <span className="flex items-baseline gap-2.5 min-w-0">
            <Icon
              className={`w-3.5 h-3.5 shrink-0 self-center ${KIND_COLOR[item.kind] ?? "text-stone-500"}`}
            />
            <span className="text-sm text-stone-800 truncate">{item.text}</span>
            <TimeAgo
              iso={item.at}
              className="ml-auto shrink-0 text-[11px] text-stone-500 tabular-nums"
            />
          </span>
        );
        return (
          <li key={item.id}>
            {item.url ? (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-2 rounded-lg hover:bg-white/70 transition"
              >
                {row}
              </a>
            ) : (
              <span className="block px-3 py-2 rounded-lg">{row}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
