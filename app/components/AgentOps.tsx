"use client";

import { Bot, ArrowUpRight } from "lucide-react";
import snapshot from "../../public/agent-ops.json";
import { AGENT_LOG } from "../lib/agentlog";

interface Job {
  key: string;
  displayName: string;
  cadenceLabel: string;
  health: { key: string; label: string };
}

const data = snapshot as unknown as {
  generatedAt: string;
  summary: {
    automationCount: number;
    headlessChecksPerDay: number;
    scheduledAgentRunsPerDay: number;
    automaticProjectWrites: number;
  };
  findings: { headline: string; overallStatus: string };
  jobs: Job[];
};

const HEALTH_COLOR: Record<string, string> = {
  healthy: "#7bc043",
  ready: "#5ba8c4",
  running: "#7bc043",
  attention: "#d97706",
};

function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return s + "s ago";
  const m = Math.floor(s / 60);
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  return Math.floor(h / 24) + "d ago";
}

export function AgentOps() {
  const s = data.summary;
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-stone-800">Built by agents, in the open</h2>
        <span className="text-xs text-stone-600">snapshot {timeAgo(data.generatedAt)}</span>
      </div>
      <p className="text-xs text-stone-700 -mt-2">
        Every pixel of this site — including this window — was designed, written, tested,
        and deployed by agent sessions. Here’s the proof.
      </p>

      <div className="grid grid-cols-2 gap-2 text-center">
        {[
          { n: s.automationCount, label: "automations running" },
          { n: s.scheduledAgentRunsPerDay, label: "agent runs / day" },
          { n: s.headlessChecksPerDay, label: "headless checks / day" },
          { n: s.automaticProjectWrites, label: "writes without Colin" },
        ].map((stat) => (
          <div key={stat.label} className="p-2.5 rounded-lg bg-white/60 border border-stone-200/60">
            <p className="text-lg font-bold text-stone-800">{stat.n}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-600">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-100/80">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-600 mb-1">
          What agents did to this site
        </p>
        <div className="space-y-2.5">
          {AGENT_LOG.map((entry) => (
            <div key={entry.title}>
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-semibold text-stone-800 text-sm">{entry.title}</h3>
                <span className="shrink-0 text-[11px] text-stone-600">{entry.date}</span>
              </div>
              <p className="text-sm text-stone-700 leading-relaxed">{entry.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-600 mb-1.5">
          The wider fleet · {data.findings.overallStatus}
        </p>
        <div className="space-y-1">
          {data.jobs.map((job) => (
            <div
              key={job.key}
              className="flex items-center gap-2.5 p-2 rounded-lg bg-white/60 border border-stone-200/60"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: HEALTH_COLOR[job.health.key] ?? "#a8a29e" }}
              />
              <span className="text-sm text-stone-800 font-medium truncate">{job.displayName}</span>
              <span className="ml-auto shrink-0 text-[11px] text-stone-600">{job.cadenceLabel}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-stone-600 mt-1.5 italic">
          {data.findings.headline}
        </p>
      </div>

      <a
        href="/apps/agent"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 p-2.5 rounded-lg bg-stone-800 text-white text-sm font-medium hover:bg-stone-700 transition"
      >
        <Bot className="w-4 h-4" />
        Open the full operations dashboard
        <ArrowUpRight className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}
