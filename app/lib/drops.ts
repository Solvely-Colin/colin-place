import type { FeedItem } from "./activity";

// Colin-approved transmissions: posts, announcements, and moments worth
// featuring. Curated by Colin and Aiden — this is how X/LinkedIn writing
// lands on the site without sketchy scraping.
export const DROPS: FeedItem[] = [
  {
    id: "drop-os-2",
    kind: "site",
    text: "Colin OS 2.0 went live — the site officially became a living thing.",
    url: "https://colin.place",
    at: "2026-07-22T03:30:00Z",
    source: "drop",
  },
  {
    id: "drop-mascot",
    kind: "site",
    text: "Clippy Colin got a real face. Feeling Loopy, officially.",
    at: "2026-07-22T03:30:00Z",
    source: "drop",
  },
];
