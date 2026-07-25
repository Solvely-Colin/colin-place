#!/usr/bin/env node

/**
 * Journal nightly DRAFT pipeline.
 *
 * Gathers the last 24h of Colin's public GitHub signals plus optional private
 * inbox notes, drafts ONE short first-person journal entry, and writes it to
 * ~/clawd/journal-drafts/YYYY-MM-DD.md.
 *
 * This script only ever produces DRAFTS. It never publishes, and it never
 * writes into this repo's app/ or public/ trees. A draft enters
 * app/lib/journal.ts only after Colin reads and approves it by hand.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dirname, "..");
const home = os.homedir();
const timezone = "America/Indiana/Indianapolis";
const githubUser = "Solvely-Colin";
const notesPath = path.join(home, "clawd", "notes", "journal-inbox.md");
const draftsDir = path.join(home, "clawd", "journal-drafts");

function todayKey() {
  // YYYY-MM-DD in Colin's local timezone.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

async function fetchPublicEvents() {
  const url = `https://api.github.com/users/${githubUser}/events/public?per_page=100`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "colin-place",
      Accept: "application/vnd.github+json",
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub events request failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

function summarizeEvents(events) {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const repos = new Map();
  const bump = (repo, kind, detail) => {
    if (!repos.has(repo)) {
      // The events API no longer includes payload.commits, so we track pushes, not commits.
      repos.set(repo, { pushes: 0, prsOpened: 0, prsMerged: 0, reviews: 0, issues: 0, other: 0, details: [] });
    }
    const entry = repos.get(repo);
    entry[kind] += 1;
    if (detail) entry.details.push(detail);
  };

  for (const event of events) {
    const at = new Date(event.created_at).getTime();
    if (Number.isNaN(at) || at < cutoff) continue;
    const repo = event.repo?.name ?? "unknown";
    switch (event.type) {
      case "PushEvent": {
        bump(repo, "pushes");
        break;
      }
      case "PullRequestEvent": {
        const action = event.payload?.action;
        const title = event.payload?.pull_request?.title;
        if (action === "opened") bump(repo, "prsOpened", title ? `PR opened: ${title}` : null);
        else if (action === "closed" && event.payload?.pull_request?.merged) bump(repo, "prsMerged", title ? `PR merged: ${title}` : null);
        else bump(repo, "other", title ? `PR ${action}: ${title}` : null);
        break;
      }
      case "PullRequestReviewEvent":
        bump(repo, "reviews", event.payload?.pull_request?.title ? `reviewed: ${event.payload.pull_request.title}` : null);
        break;
      case "IssuesEvent":
        bump(repo, "issues", event.payload?.issue?.title ? `issue ${event.payload?.action}: ${event.payload.issue.title}` : null);
        break;
      case "IssueCommentEvent":
      case "CreateEvent":
      case "DeleteEvent":
      case "WatchEvent":
      case "ForkEvent":
      default:
        bump(repo, "other");
        break;
    }
  }
  return repos;
}

function renderSignalsSummary(repos) {
  if (repos.size === 0) return "No public GitHub activity in the last 24 hours.";
  const lines = [];
  for (const [repo, entry] of Array.from(repos.entries()).sort((a, b) => b[1].pushes - a[1].pushes)) {
    const bits = [];
    if (entry.pushes) bits.push(`${entry.pushes} push(es)`);
    if (entry.prsOpened) bits.push(`${entry.prsOpened} PR(s) opened`);
    if (entry.prsMerged) bits.push(`${entry.prsMerged} PR(s) merged`);
    if (entry.reviews) bits.push(`${entry.reviews} review(s)`);
    if (entry.issues) bits.push(`${entry.issues} issue event(s)`);
    if (entry.other) bits.push(`${entry.other} other event(s)`);
    lines.push(`- ${repo}: ${bits.join("; ")}`);
    for (const detail of entry.details.slice(0, 5)) lines.push(`  - ${detail}`);
  }
  return lines.join("\n");
}

function readNotes() {
  try {
    if (!fs.existsSync(notesPath)) return null;
    const text = fs.readFileSync(notesPath, "utf8").trim();
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

async function discoverChatModel(apiKey) {
  const response = await fetch("https://api.moonshot.ai/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) {
    throw new Error(`Model discovery failed: ${response.status} ${response.statusText}`);
  }
  const body = await response.json();
  const ids = (body.data ?? []).map((model) => model.id).filter((id) => typeof id === "string");
  const chatIds = ids.filter((id) => !/embedding|vision|image|audio|speech|moderation/i.test(id));
  const preferred =
    chatIds.find((id) => /^kimi-k2/i.test(id)) ??
    chatIds.find((id) => /^kimi-/i.test(id)) ??
    chatIds.find((id) => /^moonshot-v1/i.test(id)) ??
    chatIds[0];
  if (!preferred) throw new Error("Model discovery returned no usable chat model.");
  return preferred;
}

function buildPrompt(signalsSummary, notes) {
  const system = [
    "You are drafting a nightly journal entry for Colin, in Colin's first-person voice.",
    "Rules: 3-6 sentences. Plain and honest. No hype, no exclamation points, no marketing words.",
    "Only state what the supplied signals and notes support. Never invent facts, feelings with specifics, collaborators, plans, or outcomes that are not in the material.",
    "If the day was quiet, it is fine to say the day was quiet.",
    "Do not mention GitHub, APIs, or that this was drafted by a model. Write like a person noting what the day held.",
  ].join(" ");
  const user = [
    "Public activity signals from the last 24 hours:",
    signalsSummary,
    "",
    notes ? `Private inbox notes (may be used, may be partial):\n${notes}` : "Private inbox notes: none.",
    "",
    "Write the journal entry now: one paragraph, 3-6 sentences, first person.",
  ].join("\n");
  return { system, user };
}

async function draftWithLlm(signalsSummary, notes) {
  const apiKey = process.env.KIMI_API_KEY;
  if (!apiKey) throw new Error("KIMI_API_KEY is not set.");
  const model = await discoverChatModel(apiKey);
  const { system, user } = buildPrompt(signalsSummary, notes);
  const response = await fetch("https://api.moonshot.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: 400,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!response.ok) {
    throw new Error(`Chat completion failed: ${response.status} ${response.statusText}`);
  }
  const body = await response.json();
  const text = body.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Chat completion returned an empty draft.");
  return { draft: text, source: `kimi (${model})` };
}

function draftFromTemplate(signalsSummary, repos, notes) {
  // Plain fallback assembled only from the signals; used whenever the LLM path fails.
  const sentences = [];
  if (repos.size === 0) {
    sentences.push("No public code activity showed up today.");
  } else {
    const names = Array.from(repos.keys());
    const totalPushes = Array.from(repos.values()).reduce((sum, entry) => sum + entry.pushes, 0);
    const merged = Array.from(repos.values()).reduce((sum, entry) => sum + entry.prsMerged, 0);
    sentences.push(
      `Today I worked across ${names.length === 1 ? `the ${names[0]} repo` : `${names.length} repos: ${names.join(", ")}`}.`
    );
    if (totalPushes > 0) sentences.push(`That came to ${totalPushes} push(es).`);
    if (merged > 0) sentences.push(`${merged} pull request(s) got merged.`);
  }
  if (notes) {
    sentences.push("I also left myself some notes for the day; they are in the appendix below for me to weave in when I review this.");
  }
  sentences.push("This is a template draft — the model pass did not run, so I should rewrite this in my own words before it goes anywhere.");
  return { draft: sentences.join(" "), source: "template fallback" };
}

function renderDraftFile(dateKey, draft, source, signalsSummary, notes) {
  return [
    "DRAFT — not published. Colin approves before it enters app/lib/journal.ts.",
    "",
    `Date: ${dateKey} (${timezone})`,
    `Drafted by: ${source}`,
    "",
    draft,
    "",
    "---",
    "",
    "## Signals appendix (last 24h, public GitHub only)",
    "",
    signalsSummary,
    "",
    "## Private inbox notes",
    "",
    notes ?? "(none)",
    "",
  ].join("\n");
}

async function main() {
  let events = [];
  let signalsError = null;
  try {
    events = await fetchPublicEvents();
  } catch (error) {
    signalsError = error instanceof Error ? error.message : String(error);
  }

  const repos = summarizeEvents(events);
  const signalsSummary = signalsError
    ? `GitHub signals unavailable: ${signalsError}`
    : renderSignalsSummary(repos);
  const notes = readNotes();

  let result;
  try {
    result = await draftWithLlm(signalsSummary, notes);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    result = draftFromTemplate(signalsSummary, repos, notes);
    result.source = `${result.source} (LLM path failed: ${reason})`;
  }

  const dateKey = todayKey();
  const outputPath = path.join(draftsDir, `${dateKey}.md`);

  // Safety: never write into the repo's app/ or public/ trees.
  const resolved = path.resolve(outputPath);
  if (resolved.startsWith(path.join(repoRoot, "app")) || resolved.startsWith(path.join(repoRoot, "public"))) {
    throw new Error(`Refusing to write draft inside the repo tree: ${resolved}`);
  }

  fs.mkdirSync(draftsDir, { recursive: true });
  fs.writeFileSync(outputPath, renderDraftFile(dateKey, result.draft, result.source, signalsSummary, notes));
  process.stdout.write(`Wrote journal draft to ${outputPath} (source: ${result.source})\n`);
}

main().catch((error) => {
  process.stderr.write(`draft-journal failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
