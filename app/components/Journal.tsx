"use client";

import { BadgeCheck } from "lucide-react";
import { JOURNAL_ENTRIES } from "../lib/journal";

function formatDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function Journal() {
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-stone-800">The Journal</h2>
        <span className="text-xs text-stone-600">first-person, current, honest</span>
      </div>
      <p className="text-xs text-stone-700 -mt-2">
        Drafted nightly from public signals and notes Colin sends privately.
        Nothing appears here without his explicit approval.
      </p>

      {JOURNAL_ENTRIES.length === 0 ? (
        <div className="p-4 rounded-lg bg-white/60 border border-stone-200/60 text-sm text-stone-700 italic">
          The first entry is being drafted. It shows up here once Colin reads
          it and stamps it — his voice, his call.
        </div>
      ) : (
        <div className="space-y-3">
          {JOURNAL_ENTRIES.map((entry) => (
            <article
              key={entry.date + entry.title}
              className="p-4 rounded-lg bg-white/60 border border-stone-200/60 space-y-2"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-semibold text-stone-800 text-sm">{entry.title}</h3>
                <span className="shrink-0 text-[11px] text-stone-600">
                  {formatDate(entry.date)}
                </span>
              </div>
              <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">
                {entry.body}
              </p>
              <p className="flex items-center gap-1 text-[11px] font-medium text-teal-700">
                <BadgeCheck className="w-3.5 h-3.5" />
                Colin approved ✓
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
