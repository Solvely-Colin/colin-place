"use client";

import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

const STATS = [
  { value: "82+", label: "merged PRs across OpenClaw & GSD" },
  { value: "64k★", label: "community he helped admin & steward" },
  { value: "INBOUND", label: "HubSpot event speaker" },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600">{title}</h3>
      {children}
    </section>
  );
}

function Role({
  title,
  org,
  dates,
  points,
}: {
  title: string;
  org: string;
  dates: string;
  points: string[];
}) {
  return (
    <div className="p-3.5 rounded-lg bg-white/60 border border-stone-200/60 space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <h4 className="font-semibold text-stone-800">
          {title} <span className="font-normal text-stone-700">· {org}</span>
        </h4>
        <span className="text-xs text-stone-600 shrink-0">{dates}</span>
      </div>
      <ul className="text-sm text-stone-600 space-y-1 list-disc pl-4 leading-relaxed">
        {points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </div>
  );
}

export function Resume() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-stone-800">Colin Johnson</h2>
        <p className="text-stone-700">Developer Relations &amp; Open Source Ecosystem Leader</p>
        <p className="text-xs text-stone-600 mt-1">Indiana, US · hello@colin.place</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {STATS.map((s) => (
          <div key={s.label} className="p-3 rounded-lg bg-teal-50/80 border border-teal-100 text-center">
            <div className="text-lg font-bold text-teal-700">{s.value}</div>
            <div className="text-[11px] leading-tight text-teal-900/70">{s.label}</div>
          </div>
        ))}
      </div>

      <Section title="Open Source">
        <Role
          title="Volunteer Maintainer & Contributor"
          org="OpenClaw Foundation"
          dates="Feb 2026 – Present"
          points={[
            "29 merged PRs into openclaw/openclaw — iOS, Android, macOS, web UI, Slack, Discord, and the plugin runtime.",
            "Built QA evidence infrastructure (artifact gallery, scripted scenarios) now running in the project CI.",
            "Hardened Slack ingress, shipped iOS and Android control-surface fixes, and realtime voice reliability work.",
          ]}
        />
        <Role
          title="Community Admin, Maintainer & Contributor"
          org="GSD / Open GSD"
          dates="Feb 2026 – Present"
          points={[
            "Admin and maintainer on the original 64k-star get-shit-done project; helped steward the ecosystem into Open GSD.",
            "18 merged PRs to gsd-browser, a Rust browser-automation CLI: full MCP stdio server, agent primitives, replayable evidence bundles.",
            "Supports contributors across GitHub and Discord, turning friction into issues, docs, and roadmap input.",
          ]}
        />
      </Section>

      <Section title="Professional">
        <Role
          title="Senior Manager, CRM"
          org="Youth Enrichment Brands"
          dates="Dec 2024 – Present"
          points={[
            "Owns CRM platform architecture across four franchise brands and separate HubSpot portals.",
            "Builds custom HubSpot apps, API integrations, and lifecycle email tooling used by franchise sales teams daily.",
            "Speaker at HubSpot events including INBOUND.",
          ]}
        />
        <Role
          title="CRM Lead → Regional Manager → Sales Operations"
          org="Viewrail"
          dates="2021 – 2024"
          points={[
            "Scoped CRM requirements, wrote technical specs, and coordinated delivery across development teams and stakeholders.",
          ]}
        />
      </Section>

      <Section title="Ships In">
        <div className="flex flex-wrap gap-1.5">
          {["TypeScript", "Rust", "Go", "Python", "MCP Servers", "Agent Tooling", "CI / QA Evidence", "HubSpot", "Community Ops", "Docs & Demos"].map((s) => (
            <span key={s} className="px-2.5 py-1 bg-stone-100 text-stone-600 rounded-full text-xs font-medium">
              {s}
            </span>
          ))}
        </div>
      </Section>

      <div className="flex items-center justify-between pt-2 border-t border-stone-200/70">
        <span className="text-stone-600 text-xs">Full PDF on request.</span>
        <div className="flex gap-3 text-sm">
          <a
            href="https://github.com/Solvely-Colin"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-teal-700 hover:text-teal-900 font-medium"
          >
            GitHub <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://www.linkedin.com/in/colin-w-johnson/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-teal-700 hover:text-teal-900 font-medium"
          >
            LinkedIn <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
