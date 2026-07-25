export interface AgentLogEntry {
  date: string; // YYYY-MM-DD
  title: string;
  detail: string;
}

// The site's own agent-built changelog. Every entry was planned, written,
// validated, and deployed by an agent session — the agents append here
// themselves as they ship. This file is the proof, not a claim.
export const AGENT_LOG: AgentLogEntry[] = [
  {
    date: "2026-07-23",
    title: "The site started narrating itself",
    detail:
      "This Agent Ops window went live: the automation fleet's public snapshot plus this changelog, so visitors can watch the site being built by agents in the open.",
  },
  {
    date: "2026-07-22",
    title: "The Pulse — Live grew a nervous system",
    detail:
      "The Live window went from raw GitHub events to real telemetry: open PRs with state, push velocity, the repos Colin is shepherding, language mix. Also caught and fixed GitHub silently dropping commit data from their API.",
  },
  {
    date: "2026-07-22",
    title: "A mascot that actually looks like Colin",
    detail:
      "Regenerated from three reference photos — his hair, his frames, his mustache, plain black tee. Loopy era retired. He now also reacts to real GitHub events as they happen.",
  },
  {
    date: "2026-07-22",
    title: "The Journal and The Workshop",
    detail:
      "Two new windows: approval-gated first-person entries (nothing publishes without Colin's ✓) and playable artifacts instead of resume bullets.",
  },
  {
    date: "2026-07-22",
    title: "The desktop became a place",
    detail:
      "Time-of-day wallpaper, drifting clouds, night stars with shooting stars, and occasional rain showers rolling through the OS.",
  },
  {
    date: "2026-07-22",
    title: "Visitors can see each other",
    detail:
      "Live presence plus shared cursors — everyone on the site sees everyone else's cursor gliding around. The site became a shared room.",
  },
  {
    date: "2026-07-22",
    title: "The mascot became an agent",
    detail:
      "The Ask bot went from FAQ to a bounded tool-loop agent: it reads live telemetry and searches Colin's GitHub history, and answers with receipts.",
  },
  {
    date: "2026-07-22",
    title: "Readability and drag surgery",
    detail:
      "Full contrast pass for accessibility, and fixed windows rubber-banding back to their spawn point mid-drag.",
  },
];
