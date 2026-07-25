import { JOURNAL_ENTRIES } from "./journal";
import { AGENT_LOG } from "./agentlog";
import { DROPS } from "./drops";

export type TimelineKind = "journal" | "agents" | "build" | "drop";

export interface TimelineEntry {
  slug: string;
  date: string; // YYYY-MM-DD
  kind: TimelineKind;
  title: string;
  summary: string;
  body?: string[];
  links?: { label: string; href: string }[];
  /** Entry page embeds the gsd-browser terminal replay. */
  replay?: boolean;
}

export const KIND_META: Record<
  TimelineKind,
  { label: string; color: string; bg: string }
> = {
  journal: { label: "Journal", color: "#6366f1", bg: "#eef2ff" },
  agents: { label: "Agent log", color: "#db2777", bg: "#fdf2f8" },
  build: { label: "Workshop", color: "#0284c7", bg: "#f0f9ff" },
  drop: { label: "Drop", color: "#d97706", bg: "#fffbeb" },
};

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

// The two Workshop stories, published as feed entries the day the Workshop
// window shipped. The builds are real; the replay is labeled as a retelling
// on the entry page itself.
const BUILD_ENTRIES: TimelineEntry[] = [
  {
    slug: "building-gsd-browser",
    date: "2026-07-22",
    kind: "build",
    title: "Building gsd-browser: a headless browser agents can trust",
    summary:
      "The problem: agents kept fumbling browser setup. The fix: one Rust CLI with a full MCP server — install, smoke-test, and ship a replayable evidence bundle a reviewer can re-run.",
    body: [
      "gsd-browser is GSD's headless-browser CLI for agents: one install command, a built-in MCP server, and an evidence pipeline that turns every test run into a tarball of per-step screenshots, DOM snapshots, and timing logs that anyone can replay.",
      "Below is a dramatized replay of the build. The work is real — 18 merged PRs — but the keystrokes and timings are a retelling, not a captured session.",
    ],
    replay: true,
  },
  {
    slug: "openclaw-with-receipts",
    date: "2026-07-22",
    kind: "build",
    title: "OpenClaw, with receipts",
    summary:
      "Volunteer-maintaining an open-source personal AI assistant means the work is public by default: 29 merged PRs across iOS, Android, macOS, web, Slack, Discord, and the plugin runtime — plus QA evidence infrastructure now running in project CI.",
    body: [
      "Every claim here links to a public GitHub page — the repo, an open PR with its CI status and review thread, and the QA evidence bundles behind it. Reproducible beats persuasive.",
    ],
    links: [
      {
        label: "openclaw/openclaw — the upstream repo",
        href: "https://github.com/openclaw/openclaw",
      },
      {
        label: "PR #112472 — diff, CI status, and review thread",
        href: "https://github.com/openclaw/openclaw/pull/112472",
      },
      {
        label: "pr-proof-assets — screenshots, logs, replayable proof",
        href: "https://github.com/Solvely-Colin/pr-proof-assets",
      },
    ],
  },
];

function buildTimeline(): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    ...JOURNAL_ENTRIES.map((e) => ({
      slug: slugify(e.title),
      date: e.date,
      kind: "journal" as const,
      title: e.title,
      summary: e.body,
    })),
    ...AGENT_LOG.map((e) => ({
      slug: slugify(e.title),
      date: e.date,
      kind: "agents" as const,
      title: e.title,
      summary: e.detail,
    })),
    ...BUILD_ENTRIES,
    ...DROPS.map((d) => ({
      slug: slugify(d.text),
      date: d.at.slice(0, 10),
      kind: "drop" as const,
      title: d.text,
      summary: d.text,
      links: d.url ? [{ label: d.url, href: d.url }] : undefined,
    })),
  ];

  // Newest first; ties keep source order (journal > agents > builds > drops).
  const sorted = entries.sort((a, b) => b.date.localeCompare(a.date));

  // Guard against slug collisions across sources.
  const seen = new Map<string, number>();
  for (const entry of sorted) {
    const count = seen.get(entry.slug) ?? 0;
    seen.set(entry.slug, count + 1);
    if (count > 0) entry.slug = `${entry.slug}-${count + 1}`;
  }
  return sorted;
}

export const TIMELINE: TimelineEntry[] = buildTimeline();

export function getEntry(slug: string): TimelineEntry | undefined {
  return TIMELINE.find((e) => e.slug === slug);
}
