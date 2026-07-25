export interface ReplayLine {
  kind: "cmd" | "out" | "note";
  text: string;
}

export interface EvidenceCard {
  title: string;
  blurb: string;
  href: string;
}

// A dramatized terminal replay of building gsd-browser — GSD's headless-browser
// CLI for agents. The build is real; the keystrokes, timings, and exact output
// are a retelling, not a captured session. The UI labels it as such.
export const GSD_BROWSER_REPLAY: ReplayLine[] = [
  { kind: "note", text: "The problem: agents kept fumbling browser setup. Wanted one CLI that just works." },
  { kind: "cmd", text: "npm i -g gsd-browser" },
  { kind: "out", text: "added 1 package in 3s" },
  { kind: "cmd", text: "gsdbrowse install" },
  { kind: "out", text: "downloading chromium (headless shell)… done" },
  { kind: "out", text: "browser ready at ~/.gsd/browser" },
  { kind: "note", text: "Next: prove it speaks MCP before wiring it into the agent loop." },
  { kind: "cmd", text: "gsdbrowse mcp smoke" },
  { kind: "out", text: "starting MCP server on stdio…" },
  { kind: "out", text: "tools/list → browser_navigate, browser_snapshot, browser_click, browser_type" },
  { kind: "out", text: "navigate https://example.com → ok (312ms)" },
  { kind: "out", text: "smoke passed ✓ 4/4 tools responding" },
  { kind: "note", text: "Green. Now the part reviewers actually care about: evidence." },
  { kind: "cmd", text: "gsdbrowse test --replay" },
  { kind: "out", text: "running suite: navigation, snapshots, form fills, shadow DOM" },
  { kind: "out", text: "27 passed, 0 failed" },
  { kind: "out", text: "evidence bundle → ./evidence/gsdbrowse-replay-2026-07.tar.gz" },
  { kind: "out", text: "contains: per-step screenshots, DOM snapshots, timing log, this exact command list" },
  { kind: "note", text: "One tarball a reviewer can unzip and re-run. Reproducible > persuasive." },
  { kind: "cmd", text: "gsdbrowse replay ./evidence/gsdbrowse-replay-2026-07.tar.gz" },
  { kind: "out", text: "replaying 27 steps… all green. ship it." },
];

// OpenClaw CI evidence gallery — every card links to a public GitHub page.
// Blurbs describe what the link shows, not private context.
export const OPENCLAW_EVIDENCE: EvidenceCard[] = [
  {
    title: "openclaw/openclaw",
    blurb: "The upstream repo. Where the CI runs and where the work lands.",
    href: "https://github.com/openclaw/openclaw",
  },
  {
    title: "PR #112472",
    blurb: "Colin's open pull request — diff, CI status, and review thread, all public.",
    href: "https://github.com/openclaw/openclaw/pull/112472",
  },
  {
    title: "pr-proof-assets",
    blurb: "QA evidence behind the PR: screenshots, logs, and replayable proof bundles.",
    href: "https://github.com/Solvely-Colin/pr-proof-assets",
  },
];
