"use client";

import { ExternalLink, Hammer, Terminal } from "lucide-react";
import { OPENCLAW_EVIDENCE } from "../lib/workshop";
import { TerminalReplay } from "./TerminalReplay";

function EvidenceGallery() {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400 mb-2">
        OpenClaw CI evidence gallery
      </p>
      <div className="space-y-1.5">
        {OPENCLAW_EVIDENCE.map((card) => (
          <a
            key={card.href}
            href={card.href}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 rounded-lg bg-white/60 border border-stone-200/60 hover:bg-white/90 transition group"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-stone-800 group-hover:underline">
                {card.title}
              </p>
              <ExternalLink className="w-3.5 h-3.5 shrink-0 text-stone-400 group-hover:text-stone-600 transition" />
            </div>
            <p className="text-xs text-stone-700 mt-0.5 leading-snug">{card.blurb}</p>
          </a>
        ))}
      </div>
    </div>
  );
}

export function Workshop() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Hammer className="w-4 h-4 text-amber-600" />
        <h2 className="text-lg font-bold text-stone-800">The Workshop</h2>
      </div>
      <p className="text-xs text-stone-700 -mt-2">
        Playable artifacts instead of resume bullets. Click things; they do things.
      </p>

      <div className="p-3.5 rounded-lg bg-white/60 border border-stone-200/60">
        <TerminalReplay />
      </div>

      <div className="p-3.5 rounded-lg bg-white/60 border border-stone-200/60">
        <EvidenceGallery />
      </div>

      <p className="text-[11px] text-stone-400 italic flex items-center gap-1">
        <Terminal className="w-3 h-3" />
        Everything here links out to public GitHub. No private footage.
      </p>
    </div>
  );
}
