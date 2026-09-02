# colin.place

Colin Johnson's personal site and playground. He builds in the open.

The home page is a light, precise single page: off-white paper, hairlines, Instrument Sans and Fragment Mono, one cobalt accent. Its hero draws Colin's real
public GitHub events along an infinity loop (the "Feeling Loopy" hat, in commits);
hover a light to see the event behind it. Below that: what he is doing now, numbers
that link to their sources, the ecosystems he works in, open PRs as they stand,
an About that the site rewrites itself, his open PRs, a career path, and contact.

Every change to this site is planned, written, tested, and deployed by agent
sessions, with Colin approving what ships. The agents append to
`app/lib/agentlog.ts` as they go; that log is the proof.

## The About that writes itself

The About section is generated: a model reads Colin's live GitHub signals
(recent events, open PRs, featured repos), writes a third-person narrative
with links to real events, and the result is cached in Redis under a
signature of those signals. When a PR, release, or repo lands, the signature
moves, the page serves the last text and queues a rewrite after the response.
`GET /api/about` shows the current state; `POST /api/about` with the admin
token forces a rewrite. Without `OLLAMA_API_KEY` the hand-written fallback in
`app/lib/profile.ts` is shown and labelled as such.

## The Town

`/town` is a tiny isometric town where every building is an idea. Colin's projects
are the first lots. Type a description and the architect writes a building spec
as JSON (name, shape, floors, roof, palette, features, and an interior with rooms
and a question); the engine draws it, a crane raises it on the next empty lot, and
you walk in. `?hour=22` previews the town at another time of day.

Env vars:

- `OLLAMA_API_KEY` — an Ollama Cloud key (ollama.com/settings/keys). Without it
  the architect falls back to a deterministic "blueprint" and says so.
- `OLLAMA_MODEL` — defaults to `glm-5.3-flash:cloud`; `glm-5.3:cloud` for the full model.
- `TOWN_ADMIN_TOKEN` — unlocks `/town/admin`, where visitor-built buildings wait
  for approval before the whole town sees them. Needs the Upstash vars below.

## Routes

- `/` — the site
- `/town` and `/town/admin` — the town, and its zoning office
- `/api/town/build`, `/api/town/admin` — build a building; approve or reject one
- `/apps/agent` — a public snapshot of the automation fleet
- `/api/feed`, `/api/pulse`, `/api/repos` — live GitHub telemetry (cached 10–60 min)
- `/api/ask` — the Clippy Colin chat (needs `OPENAI_API_KEY`)
- `/api/presence` — shared presence (needs Upstash Redis env vars)

## Working on it

```bash
npm install
npm run dev
```

`npm run build` snapshots automation status into `public/agent-ops.json` first,
then builds. Claims that are not live signals live in `app/lib/profile.ts` so they
are one file to audit.

Next.js 16 with the App Router, Tailwind v4, Framer Motion, and `next/font`
(Instrument Sans, Fragment Mono).
