import type { FeedItem } from "./activity";
import type { PulseData } from "./pulse";
import type { ReposPayload } from "./repos";
import { ABOUT_FALLBACK, BIG_NUMBERS, ECOSYSTEMS, JOURNEY, NOW_ITEMS } from "./profile";
import { kvConfigured, kvGet, kvSet } from "./kv";
import { ollamaJson, ollamaReady } from "./ollama";

// The About section writes itself. A model reads Colin's live public signals
// and produces a third-person narrative with links to real events. The text
// is cached under a signature of those signals, so it is rewritten only when
// something new ships: a PR opened or merged, a release, a new repo.

export interface AboutHighlight {
  title: string;
  detail: string;
  url: string;
}

export interface AboutNarrative {
  lede: string;
  paragraphs: string[];
  highlights: AboutHighlight[];
  reason: string;
}

export interface AboutRecord {
  signature: string;
  generatedAt: string;
  model: string;
  source: "model" | "fallback";
  narrative: AboutNarrative;
}

export interface AboutInputs {
  pulse: PulseData;
  events: FeedItem[];
  repos: ReposPayload;
}

const KEY = "about:narrative";
const GENERATE_TIMEOUT_MS = 40000;

export function aboutSignature(input: AboutInputs): string {
  const parts = [
    ...input.events.slice(0, 12).map((e) => e.id),
    ...input.pulse.openPrs.map((p) => p.repo + "#" + p.number),
    ...input.repos.featured.map((r) => r.name + "@" + r.pushedAt),
  ];
  let h = 2166136261;
  const s = parts.join("|");
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export function fallbackRecord(signature: string): AboutRecord {
  return {
    signature,
    generatedAt: "2026-09-02T00:00:00Z",
    model: "hand-written",
    source: "fallback",
    narrative: ABOUT_FALLBACK,
  };
}

const SCHEMA = {
  type: "object",
  properties: {
    lede: { type: "string", description: "One sentence, max 180 characters, that says who Colin is right now." },
    paragraphs: {
      type: "array",
      items: { type: "string" },
      minItems: 3,
      maxItems: 4,
      description: "3-4 paragraphs of 60-110 words: what he works on, what he shipped recently, what he is shepherding, what he is looking for.",
    },
    highlights: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "max 60 chars" },
          detail: { type: "string", description: "one line, max 140 chars" },
          url: { type: "string", description: "a URL copied exactly from the data" },
        },
        required: ["title", "detail", "url"],
      },
      minItems: 3,
      maxItems: 5,
    },
    reason: { type: "string", description: "One line, max 120 chars: what changed that prompted this rewrite." },
  },
  required: ["lede", "paragraphs", "highlights", "reason"],
} as const;

const SYSTEM = `You write the About section of colin.place, Colin Johnson's personal site. The site writes about him; he does not write about himself here. Third person, present tense, plain and specific. No marketing voice, no exclamation marks, no "passionate", no "journey", no lists of adjectives.

Rules:
- Use ONLY facts in the data you are given. Never invent numbers, dates, employers, or projects. If something is not in the data, leave it out.
- Prefer what is recent: the events and open PRs are live from GitHub. Say what he shipped or is shipping, by name, and what repos he is pushing to.
- Every highlight must use a URL copied exactly from the data.
- Keep the fixed facts consistent: volunteer maintainer at OpenClaw; community admin and maintainer on GSD then Open GSD; Senior Manager, CRM at Youth Enrichment Brands; runs experiments under Solvely; based in Mishawaka, Indiana.
- Mention that this site is planned, written, and deployed by his own agents, and that this About was written by a model from live data.
- Safe for a general audience. Nothing private.`;

function context(input: AboutInputs, previous: AboutRecord | null): string {
  const events = input.events.slice(0, 20).map((e) => `- ${e.at.slice(0, 10)} ${e.text}${e.url ? " <" + e.url + ">" : ""}`);
  const prs = input.pulse.openPrs.map((p) => `- ${p.repo} #${p.number} ${p.draft ? "(draft) " : ""}${p.title} <${p.url}>`);
  const repos = input.repos.featured.map((r) => `- ${r.name}: ${r.description ?? ""} (${r.language ?? "?"}, ${r.stars} stars, pushed ${r.pushedAt}) <${r.url}>`);
  const shepherding = input.pulse.shepherding.map((r) => `- ${r.name} <${r.url}>`);
  const fixed = [
    ...ECOSYSTEMS.map((e) => `- ${e.name} (${e.role}): ${e.blurb} <${e.href}>`),
    ...BIG_NUMBERS.map((n) => `- ${n.value}${n.suffix ?? ""} ${n.label}: ${n.note}${n.href ? " <" + n.href + ">" : ""}`),
    ...NOW_ITEMS.map((n) => `- Now: ${n.title}. ${n.detail}`),
    ...JOURNEY.map((j) => `- ${j.when}: ${j.title}, ${j.org}. ${j.note}`),
  ];
  return [
    "FIXED FACTS",
    ...fixed,
    "",
    `LIVE TELEMETRY (as of ${input.pulse.generatedAt})`,
    `- pushes last 7 days: ${input.pulse.pushes7d}; last 30 days: ${input.pulse.pushes30d}`,
    `- language mix: ${input.pulse.languages.map((l) => l.name + " " + l.share + "%").join(", ") || "unknown"}`,
    "- repos pushed to this week:",
    ...(shepherding.length ? shepherding : ["- none"]),
    "",
    "OPEN PULL REQUESTS",
    ...(prs.length ? prs : ["- none"]),
    "",
    "RECENT PUBLIC EVENTS (newest first)",
    ...(events.length ? events : ["- none"]),
    "",
    "FEATURED REPOS",
    ...(repos.length ? repos : ["- none"]),
    "",
    previous
      ? "PREVIOUS ABOUT (rewrite it; keep what still holds, change what moved)\n" + previous.narrative.lede + "\n" + previous.narrative.paragraphs.join("\n")
      : "PREVIOUS ABOUT: none. This is the first one.",
  ].join("\n");
}

function clean(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function normalize(raw: unknown, input: AboutInputs): AboutNarrative | null {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const allowed = new Set<string>();
  for (const e of input.events) if (e.url) allowed.add(e.url);
  for (const p of input.pulse.openPrs) allowed.add(p.url);
  for (const s of input.pulse.shepherding) allowed.add(s.url);
  for (const rp of [...input.repos.featured, ...input.repos.hacking]) allowed.add(rp.url);
  for (const e of ECOSYSTEMS) allowed.add(e.href);
  for (const n of BIG_NUMBERS) if (n.href) allowed.add(n.href);
  const paragraphs = Array.isArray(r.paragraphs) ? r.paragraphs.map((p) => clean(p, 900)).filter(Boolean).slice(0, 4) : [];
  const highlights = Array.isArray(r.highlights)
    ? r.highlights
        .map((h) => {
          const o = (h && typeof h === "object" ? h : {}) as Record<string, unknown>;
          return { title: clean(o.title, 60), detail: clean(o.detail, 140), url: clean(o.url, 300) };
        })
        .filter((h) => h.title && allowed.has(h.url))
        .slice(0, 5)
    : [];
  const lede = clean(r.lede, 180);
  if (!lede || paragraphs.length < 2) return null;
  return { lede, paragraphs, highlights, reason: clean(r.reason, 120) || "Fresh activity on GitHub." };
}

async function callModel(input: AboutInputs, previous: AboutRecord | null): Promise<{ narrative: AboutNarrative; model: string } | null> {
  if (!ollamaReady()) return null;
  try {
    const out = await ollamaJson({
      system: SYSTEM,
      user: "Write the About section from this data.\n\n" + context(input, previous),
      schema: SCHEMA,
      temperature: 0.6,
      numPredict: 1800,
      timeoutMs: GENERATE_TIMEOUT_MS,
    });
    const narrative = normalize(out.json, input);
    if (!narrative) throw new Error("narrative failed validation");
    return { narrative, model: out.model };
  } catch (err) {
    console.error("[about] generation failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

/** Rewrite the About now and store it. Returns the new record, or null. */
export async function regenerateAbout(input: AboutInputs): Promise<AboutRecord | null> {
  const previous = await kvGet<AboutRecord>(KEY);
  const out = await callModel(input, previous);
  if (!out) return null;
  const record: AboutRecord = {
    signature: aboutSignature(input),
    generatedAt: new Date().toISOString(),
    model: out.model,
    source: "model",
    narrative: out.narrative,
  };
  await kvSet(KEY, record);
  return record;
}

export interface AboutState {
  record: AboutRecord;
  /** True when the live signals moved past what the stored text describes. */
  stale: boolean;
  /** True when a rewrite can actually happen (key + store present). */
  canRewrite: boolean;
}

/** The About to show right now, and whether it needs a rewrite. */
export async function loadAbout(input: AboutInputs): Promise<AboutState> {
  const signature = aboutSignature(input);
  const canRewrite = Boolean(process.env.OLLAMA_API_KEY) && kvConfigured();
  const stored = await kvGet<AboutRecord>(KEY);
  if (stored && stored.source === "model") {
    return { record: stored, stale: stored.signature !== signature, canRewrite };
  }
  return { record: fallbackRecord(signature), stale: true, canRewrite };
}
