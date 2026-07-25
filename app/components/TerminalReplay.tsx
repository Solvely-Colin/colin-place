"use client";

import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { GSD_BROWSER_REPLAY } from "../lib/workshop";

const LINE_DELAY_MS = 600;

export function TerminalReplay() {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (shown >= GSD_BROWSER_REPLAY.length) return;
    const t = setTimeout(() => setShown((n) => n + 1), LINE_DELAY_MS);
    return () => clearTimeout(t);
  }, [shown]);

  const done = shown >= GSD_BROWSER_REPLAY.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
          gsd-browser terminal replay
        </p>
        <button
          onClick={() => setShown(0)}
          className="flex items-center gap-1 text-[11px] font-medium text-stone-700 hover:text-stone-800 transition"
        >
          <RotateCcw className="w-3 h-3" />
          Replay
        </button>
      </div>
      <div className="rounded-lg bg-stone-900 border border-stone-700/60 p-3.5 font-mono text-[12px] leading-relaxed space-y-1">
        {GSD_BROWSER_REPLAY.slice(0, shown).map((line, i) => {
          if (line.kind === "cmd") {
            return (
              <p key={i} className="text-green-400">
                <span className="text-stone-400 select-none">$ </span>
                {line.text}
              </p>
            );
          }
          if (line.kind === "note") {
            return (
              <p key={i} className="text-amber-300/90 italic">
                {line.text}
              </p>
            );
          }
          return (
            <p key={i} className="text-stone-300">
              {line.text}
            </p>
          );
        })}
        {!done && <p className="text-stone-400 animate-pulse">▌</p>}
      </div>
      <p className="mt-1.5 text-[11px] text-stone-500 italic">
        Dramatized replay of a real build — keystrokes and timings retold, not a captured session.
      </p>
    </div>
  );
}
