# colin.place

Colin Johnson's personal site and playground. He builds in the open.

The home page is a light, precise single page: off-white paper, hairlines, Instrument Sans and Fragment Mono, one cobalt accent. Its hero draws Colin's real
public GitHub events along an infinity loop (the "Feeling Loopy" hat, in commits);
hover a light to see the event behind it. Below that: what he is doing now, numbers
that link to their sources, the ecosystems he works in, open PRs as they stand,
an About that the site rewrites itself, his open PRs, a career path, and contact. And it goes wrong the longer you stay.

Every change to this site is planned, written, tested, and deployed by agent
sessions, with Colin approving what ships. The agents append to
`app/lib/agentlog.ts` as they go; that log is the proof.

## The About that writes itself

The About section is generated: a model reads Colin's live GitHub signals, writes a
third-person narrative with links to real events, and the result is cached in Redis
under a signature of those signals. `GET /api/about` shows the state; `POST /api/about`
with the admin token forces a rewrite.

## The wrongness

The site goes wrong the longer you stay. Sanity starts at 100 and falls (faster at
night, when you hover the loop, when you go still, on return visits). Crossing each
band asks `POST /api/whisper` for that band's wrongness, written by the model from
coarse visitor facts and real GitHub events: rewrites of the page copy (facts stay
true; only the tone rots), margin notes, the tab title, the watcher's line, and a
scene the model composes (palette, an effect mix, motion values) that the abyss
canvas and CSS render. At zero the page speaks once; hold the button to close the
door and everything is restored. `?sanity=30` previews a band. "The site feels fine"
(bottom-left, once it starts) turns it off for good; reduced-motion users never see it.

## Env vars

- `OLLAMA_API_KEY` — an Ollama Cloud key (ollama.com/settings/keys). Powers the
  About and the wrongness.
- `OLLAMA_MODEL` — defaults to `glm-5.3-flash:cloud`; `glm-5.3:cloud` for the full model.
- `TOWN_ADMIN_TOKEN` — the admin token (name kept from an earlier feature). Forces
  an About rewrite via `POST /api/about`.
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — caches for generated text and presence.

## Routes

- `/` — the site
- `/apps/agent` — a public snapshot of the automation fleet
- `/api/feed`, `/api/pulse`, `/api/repos` — live GitHub telemetry (cached 10–60 min)
- `/api/about` — the self-writing About
- `/api/whisper` — a band of wrongness for a visitor
- `/api/presence` — shared presence (needs Upstash Redis env vars)

## Working on it

The repo is github.com/Solvely-Colin/colin-place. Pushes to `main` deploy to
colin.place through Vercel's GitHub integration.

```bash
npm install
npm run dev
```

`npm run build` snapshots automation status into `public/agent-ops.json` first,
then builds. Claims that are not live signals live in `app/lib/profile.ts` so they
are one file to audit.

Next.js 16 with the App Router, Tailwind v4, Framer Motion, and `next/font`
(Instrument Sans, Fragment Mono).
