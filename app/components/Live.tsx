"use client";

import { useEffect, useState } from "react";
import { Radio, GitCommitHorizontal, GitPullRequest, GitMerge, MessageSquare, Sparkles, Rocket } from "lucide-react";
import type { FeedItem } from "../lib/activity";
import type { PulseData } from "../lib/pulse";

const KIND_META: Record<string, { label: string; color: string }> = {
  push: { label: "Ship", color: "#5ba8c4" },
  pr: { label: "PR", color: "#8b5cf6" },
  merge: { label: "Merge", color: "#7bc043" },
  review: { label: "Review", color: "#e06c9f" },
  issue: { label: "Issue", color: "#d97706" },
  create: { label: "New", color: "#0f766e" },
  release: { label: "Release", color: "#ef4444" },
  site: { label: "Site", color: "#ff8c42" },
};

function KindIcon({ kind }: { kind: string }) {
  switch (kind) {
    case "push":
      return <GitCommitHorizontal className="w-4 h-4" />;
    case "merge":
      return <GitMerge className="w-4 h-4" />;
    case "pr":
    case "review":
      return <GitPullRequest className="w-4 h-4" />;
    case "issue":
      return <MessageSquare className="w-4 h-4" />;
    case "create":
      return <Sparkles className="w-4 h-4" />;
    case "release":
      return <Rocket className="w-4 h-4" />;
    default:
      return <Radio className="w-4 h-4" />;
  }
}

function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return s + "s ago";
  const m = Math.floor(s / 60);
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  const d = Math.floor(h / 24);
  if (d < 30) return d + "d ago";
  const mo = Math.floor(d / 30);
  return mo + "mo ago";
}

const TAGLINES = [
  "All signals public. No creepy stuff.",
  "Watching the forge, not the man.",
  "Somewhere in here, a build is passing.",
];

const LANG_COLORS = ["#5ba8c4", "#8b5cf6", "#7bc043", "#e06c9f", "#d97706"];

export function Live() {
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [pulse, setPulse] = useState<PulseData | null>(null);
  const [tagline] = useState(
    () => TAGLINES[Math.floor(Math.random() * TAGLINES.length)]
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/feed");
        const data = (await res.json()) as { items?: FeedItem[] };
        if (!cancelled) setItems(data.items ?? []);
      } catch {
        if (!cancelled) setItems([]);
      }
      try {
        const res = await fetch("/api/pulse");
        const data = (await res.json()) as PulseData;
        if (!cancelled) setPulse(data);
      } catch {
        if (!cancelled) setPulse(null);
      }
    }
    load();
    const t = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
        </span>
        <h2 className="text-lg font-bold text-stone-800">Live from Colin’s orbit</h2>
      </div>
      <p className="text-xs text-stone-700 -mt-2">{tagline}</p>

      {pulse !== null && pulse.ok && (
        <div className="p-3.5 rounded-lg bg-white/60 border border-stone-200/60 space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-stone-800">{pulse.pushes7d}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-600">pushes · 7d</p>
            </div>
            <div>
              <p className="text-lg font-bold text-stone-800">{pulse.pushes30d}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-600">pushes · 30d</p>
            </div>
            <div>
              <p className="text-lg font-bold text-stone-800">{pulse.openPrs.length}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-600">open PRs</p>
            </div>
          </div>

          {pulse.shepherding.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-600 mb-1">
                Shepherding this week
              </p>
              <div className="flex flex-wrap gap-1.5">
                {pulse.shepherding.map((r) => (
                  <a
                    key={r.name}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-2 py-0.5 rounded-full bg-amber-50 border border-amber-100 text-stone-700 hover:bg-amber-100 transition"
                  >
                    {r.name}
                  </a>
                ))}
              </div>
            </div>
          )}

          {pulse.openPrs.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-600">Open PRs</p>
              {pulse.openPrs.slice(0, 5).map((pr) => (
                <a
                  key={pr.url}
                  href={pr.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-baseline gap-2 text-sm text-stone-700 hover:text-stone-900 group"
                >
                  <span className="shrink-0 text-[11px] font-mono text-violet-600">#{pr.number}</span>
                  <span className="truncate group-hover:underline">{pr.title}</span>
                  {pr.draft && (
                    <span className="shrink-0 text-[9px] font-semibold uppercase px-1 rounded bg-stone-200 text-stone-700">
                      draft
                    </span>
                  )}
                  <span className="shrink-0 ml-auto text-[11px] text-stone-600">{timeAgo(pr.updatedAt)}</span>
                </a>
              ))}
              {pulse.openPrs.length > 5 && (
                <p className="text-[11px] text-stone-600 italic">
                  +{pulse.openPrs.length - 5} more on GitHub
                </p>
              )}
            </div>
          )}

          {pulse.languages.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-600 mb-1">
                Language mix · recent repos
              </p>
              <div className="flex h-2 rounded-full overflow-hidden">
                {pulse.languages.map((l, i) => (
                  <div
                    key={l.name}
                    style={{ width: l.share + "%", backgroundColor: LANG_COLORS[i % LANG_COLORS.length] }}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                {pulse.languages.map((l, i) => (
                  <span key={l.name} className="text-[11px] text-stone-700 flex items-center gap-1">
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ backgroundColor: LANG_COLORS[i % LANG_COLORS.length] }}
                    />
                    {l.name} {l.share}%
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {items === null ? (
        <div className="space-y-2 animate-pulse">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-lg bg-stone-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-sm text-stone-700 italic">
          The orbit is quiet right now. Suspicious. Check back soon.
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map((item) => {
            const meta = KIND_META[item.kind] ?? KIND_META.site;
            const row = (
              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-white/60 border border-stone-200/60 hover:bg-white/90 transition">
                <span
                  className="mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0"
                  style={{ backgroundColor: meta.color }}
                >
                  <KindIcon kind={item.kind} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-stone-700 leading-snug">{item.text}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className="text-[11px] font-semibold uppercase tracking-wide"
                      style={{ color: meta.color }}
                    >
                      {item.source === "drop" ? "Transmission" : meta.label}
                    </span>
                    <span className="text-[11px] text-stone-600">{timeAgo(item.at)}</span>
                  </div>
                </div>
              </div>
            );
            return item.url ? (
              <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" className="block">
                {row}
              </a>
            ) : (
              <div key={item.id}>{row}</div>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-stone-600 italic">
        Public GitHub activity + Colin-approved transmissions. The interesting private stuff stays private.
      </p>
    </div>
  );
}
