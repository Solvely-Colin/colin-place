# Journal draft pipeline

`scripts/draft-journal.mjs` drafts ONE short first-person journal entry per day from the last 24h of Colin's public GitHub activity plus optional private notes from `~/clawd/notes/journal-inbox.md`.

It writes a draft to `~/clawd/journal-drafts/YYYY-MM-DD.md`. It never publishes and never touches the repo's `app/` or `public/` trees.

Every draft is a proposal. Nothing enters `app/lib/journal.ts` or the site until Colin reads the draft and approves it himself.

Run it manually:

```sh
KIMI_API_KEY=... node scripts/draft-journal.mjs
```

Without `KIMI_API_KEY` (or if the model call fails) it falls back to a plain template draft built only from the signals.

Nightly scheduling is an OpenClaw cron decision for Colin to make — this repo does not schedule anything itself.
