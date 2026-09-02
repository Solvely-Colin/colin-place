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
    date: "2026-09-02",
    title: "The site goes wrong the longer you stay",
    detail:
      "Colin wanted novel, not chatbot: Lovecraft. Sanity starts at 100 and falls as you read, faster at night, faster when you hover the loop or go still. Each band a model writes the wrongness: rewrites of the copy (facts intact, tone rotting), notes in the margin that know what you have been doing, the tab title, the watcher's line, and a scene it composes itself: palette, effects, motion. At zero the page speaks once and you hold a button to close the door. The town is gone.",
  },
  {
    date: "2026-09-02",
    title: "The town came down; the model moved onto the page",
    detail:
      "Colin called the town buggy and asked to make the main site amazing instead. Gone: the town. In: a chat that streams from GLM-5.3 with the live wire in its head, a 'what brings you here' box that writes a tailored start-here with real links, an Explain button on every open PR that reads the diff, and a one-sentence week summary under the ticker.",
  },
  {
    date: "2026-09-02",
    title: "Every building got an inside",
    detail:
      "Walking into a building now drops you into a room the architect designed for it: floor and wall colours, four to seven objects you walk up to (a cauldron, a telescope, an aquarium, whatever fits), each with its own note, and a keeper who comes over to greet you. The prose moved to a guidebook.",
  },
  {
    date: "2026-09-02",
    title: "The About writes itself; the OS and the log retired",
    detail:
      "Receipts became About: a model reads Colin's live GitHub signals, writes a third-person narrative with links to real events, and rewrites it only when something new ships. Colin OS and the log pages were removed.",
  },
  {
    date: "2026-09-02",
    title: "Precision: the site stopped looking machine-made",
    detail:
      "Colin called the warm-dark, orange-glow, italic-serif look AI slop, and he was right. Four design systems were sketched side by side; he picked Precision: off-white paper, hairlines, Instrument Sans and Fragment Mono, one cobalt. Grain, glows, and italic accent words are gone. The loop hero is now drawn in ink.",
  },
  {
    date: "2026-09-02",
    title: "The Town: describe a building, watch it get built",
    detail:
      "A tiny isometric town at /town where every building is an idea. Colin's projects are the first eight lots. Type a description and an architect (GLM-5.3 on Ollama Cloud) writes a building spec as JSON; the engine draws it, a crane raises it on the next empty lot, and you walk in to a generated interior. Visitor builds wait for Colin's approval.",
  },
  {
    date: "2026-09-02",
    title: "Feeling Loopy: the site got its third body",
    detail:
      "Full redesign. Warm-dark editorial layout, and a hero where Colin's real GitHub events ride an infinity loop drawn in canvas (the hat, in commits). Count-up numbers with receipts, a scroll-drawn career path, a ticker for the wire, and Clippy Colin restyled. Colin OS still lives at /os.",
  },
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
