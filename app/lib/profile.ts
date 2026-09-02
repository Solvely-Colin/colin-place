// Everything on the site that is a claim rather than a live signal lives
// here, so it is one file to audit. Every number should be defensible from
// a public page; where one exists, it is linked.

export const CONTACT_LINKS = [
  { label: "Email", value: "hello@colin.place", href: "mailto:hello@colin.place" },
  { label: "GitHub", value: "Solvely-Colin", href: "https://github.com/Solvely-Colin" },
  { label: "X / Twitter", value: "@colinsolvely", href: "https://x.com/colinsolvely" },
  { label: "LinkedIn", value: "colin-w-johnson", href: "https://www.linkedin.com/in/colin-w-johnson/" },
];

export const NOW_ITEMS = [
  {
    title: "Volunteer-maintaining OpenClaw",
    detail:
      "PR review, contributor onboarding, and the QA evidence infrastructure that now runs in project CI.",
    href: "https://github.com/openclaw/openclaw",
  },
  {
    title: "Building agent tooling at Solvely",
    detail:
      "This site included. Every deploy here is planned, written, tested, and shipped by agent sessions.",
    href: "https://github.com/Solvely-Colin",
  },
  {
    title: "Senior Manager, CRM at Youth Enrichment Brands",
    detail:
      "HubSpot architecture, custom apps, and lifecycle automation across four franchise brands.",
  },
  {
    title: "Teaching this site to talk",
    detail: "A model on the page reads his live GitHub, writes the About, explains his open PRs, and answers questions.",
    href: "#about",
  },
];

export interface BigNumber {
  value: number;
  suffix?: string;
  label: string;
  note: string;
  href?: string;
}

export const BIG_NUMBERS: BigNumber[] = [
  {
    value: 82,
    suffix: "+",
    label: "merged PRs",
    note: "across OpenClaw and the GSD ecosystem",
    href: "https://github.com/Solvely-Colin",
  },
  {
    value: 64,
    suffix: "k",
    label: "stars",
    note: "on the get-shit-done project he helped admin and maintain",
    href: "https://github.com/gsd-build/get-shit-done",
  },
  {
    value: 29,
    label: "PRs into openclaw/openclaw",
    note: "iOS, Android, macOS, web, Slack, Discord, plugin runtime",
    href: "https://github.com/openclaw/openclaw/pulls?q=is%3Apr+author%3ASolvely-Colin",
  },
  {
    value: 18,
    label: "PRs into gsd-browser",
    note: "a Rust browser-automation CLI with a full MCP server",
    href: "https://github.com/open-gsd/gsd-browser/pulls?q=is%3Apr+author%3ASolvely-Colin",
  },
  {
    value: 4,
    label: "franchise brands",
    note: "four HubSpot portals, one CRM architecture, reported at board level",
  },
];

export interface Ecosystem {
  name: string;
  role: string;
  blurb: string;
  href: string;
  tags: string[];
}

export const ECOSYSTEMS: Ecosystem[] = [
  {
    name: "OpenClaw",
    role: "Volunteer maintainer",
    blurb:
      "Your own personal AI assistant, any OS, any platform. Colin reviews PRs, onboards contributors, and built the QA Lab evidence gallery, script-backed scenarios, and CI smoke profile the project now runs on.",
    href: "https://github.com/openclaw/openclaw",
    tags: ["TypeScript", "iOS", "Android", "Slack", "Discord", "CI"],
  },
  {
    name: "Open GSD",
    role: "Community admin & maintainer",
    blurb:
      "Admin on the original 64k-star get-shit-done, then helped steward it into the Open GSD org. Maintains gsd-core, gsd-pi, and gsd-browser: replayable evidence bundles, MCP transport gating, release automation.",
    href: "https://github.com/open-gsd",
    tags: ["Rust", "Go", "MCP", "Browser automation", "Discord ops"],
  },
  {
    name: "Youth Enrichment Brands",
    role: "Senior Manager, CRM",
    blurb:
      "Primary builder of cross-brand data infrastructure on HubSpot: custom apps for lead management, per-brand lifecycle email tooling, and integrations to FranConnect, Pike13, and the data warehouse. Speaker at INBOUND.",
    href: "https://www.linkedin.com/in/colin-w-johnson/",
    tags: ["HubSpot", "Custom apps", "Integrations", "Solutions architecture"],
  },
  {
    name: "Solvely",
    role: "The lab",
    blurb:
      "Where the experiments live: Quorum, a multi-model deliberation framework; SpecIt, one interview that becomes one spec; and the agents that plan, write, and deploy this very page.",
    href: "https://github.com/Solvely-Colin",
    tags: ["Agents", "Claude Code", "Next.js", "Evidence-first"],
  },
];

export interface JourneyStop {
  when: string;
  title: string;
  org: string;
  note: string;
}

export const JOURNEY: JourneyStop[] = [
  {
    when: "Aug 2021",
    title: "Sales Operations Specialist",
    org: "Viewrail",
    note: "Learned CRM the honest way: by cleaning one.",
  },
  {
    when: "Dec 2023",
    title: "Regional Manager",
    org: "Viewrail",
    note: "Ran a territory and kept turning frontline pain into process fixes.",
  },
  {
    when: "Apr 2024",
    title: "CRM Lead",
    org: "Viewrail",
    note: "Started writing specs instead of tickets. Never went back.",
  },
  {
    when: "Dec 2024",
    title: "Senior Manager, CRM",
    org: "Youth Enrichment Brands",
    note: "Four brands, four portals, one architecture. Custom apps in production daily.",
  },
  {
    when: "Feb 2026",
    title: "Community admin & maintainer",
    org: "GSD, then Open GSD",
    note: "Fifteen PRs into the 64k-star original before archival, then helped steward the org.",
  },
  {
    when: "Jun 2026",
    title: "Volunteer maintainer",
    org: "OpenClaw Foundation",
    note: "From contributor to maintainer: review, onboarding, and evidence infrastructure in CI.",
  },
  {
    when: "Jul 2026",
    title: "The site started building itself",
    org: "colin.place",
    note: "Agent sessions plan, write, test, and deploy every change. Colin approves what ships.",
  },
  {
    when: "Now",
    title: "Building a playground",
    org: "colin.place",
    note: "Ideas get built here first: an About the site writes itself, a model that explains his PRs, whatever is next.",
  },
];

export const STACK = [
  "TypeScript",
  "Rust",
  "Go",
  "Python",
  "Next.js",
  "MCP servers",
  "Claude Code",
  "GitHub Actions",
  "Browser automation",
  "HubSpot APIs",
  "Swift",
  "Kotlin",
  "Discord ops",
  "Evidence bundles",
];

// Shown until the model has written the About at least once. Hand-written,
// and the page says so.
export const ABOUT_FALLBACK = {
  lede: "Colin Johnson maintains open-source developer tools, builds developer communities from the inside, and runs the CRM architecture behind four franchise brands.",
  paragraphs: [
    "He is a volunteer maintainer at OpenClaw, the open-source personal AI assistant, where he reviews pull requests, onboards contributors, and built the QA evidence gallery and CI smoke profile the project runs on. Twenty-nine of his PRs are merged there, across iOS, Android, macOS, the web UI, Slack, Discord, and the plugin runtime.",
    "Before that he was a community admin and maintainer on the original 64k-star get-shit-done project and helped steward it into the Open GSD organization, where he maintains gsd-core, gsd-pi, and gsd-browser. His eighteen merged PRs to gsd-browser include the replayable evidence bundle schema, Playwright export, and release automation.",
    "By day he is Senior Manager, CRM at Youth Enrichment Brands: custom HubSpot apps, per-brand lifecycle email tooling, and the integrations that connect four portals to franchise systems. He has spoken at INBOUND. His experiments live under Solvely, including this site, which is planned, written, and deployed by his own agents.",
  ],
  highlights: [
    { title: "openclaw/openclaw", detail: "The upstream repo, where the maintainer work lands.", url: "https://github.com/openclaw/openclaw" },
    { title: "open-gsd/gsd-browser", detail: "A Rust browser-automation CLI for agents with a full MCP server.", url: "https://github.com/open-gsd/gsd-browser" },
    { title: "Solvely-Colin/Quorum", detail: "Multi-model deliberation: models debate, critique, and vote.", url: "https://github.com/Solvely-Colin/Quorum" },
  ],
  reason: "First draft, written by hand. The model takes over once the key is in.",
};
