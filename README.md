# Stand Up

A practice app for impromptu speaking. You get a topic, a minute to think,
then a timer while you talk. Afterwards you can play yourself back, rate the
round and write one note. Phone-first, works offline, installs to a home screen.

## The documents

These come before the code, and they stay current with it:

- **`stand-up-handoff.md`** — the source of truth for behaviour: tokens,
  components, screen specs, the round state machine, routes, copy rules.
- **`stand-up-design-brief.md`** — product context and the topic table.
- **`build-plan.md`** — the milestones, what "done" means for each, and the
  decisions taken along the way.
- **`phase-1-brief.md`** — the brief the first milestone was built from.
- **`design/`** — an export of the design canvas, one file per screen state.
  Read-only, and **out of date**: the canvas itself is the current one, and it
  now has the card-draw frames this export lacks.

Where the canvas and the handoff disagree, the canvas wins on layout and the
handoff wins on behaviour.

## Running it

Needs Node 22 — `.nvmrc` pins it, and the toolchain fails on Node 16.

```bash
nvm use
npm install
npm run dev
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on :5173 |
| `npm run build` | Type-check and build to `dist/`, including the service worker |
| `npm run preview` | Serve the built app — the only way to test offline behaviour |
| `npm run lint` | oxlint |

## How it is put together

Vite, React, TypeScript, React Router, and plain CSS with custom properties —
no UI library, no CSS-in-JS. The design is specific enough that a component
library would fight it the whole way.

- `src/routes/` — one file per screen. Prep and Speaking share `/round`.
- `src/components/` — one component per component, not per screen state.
- `src/lib/` — the timer, topics, storage, recording, sync and formatting.
- `src/styles/` — `tokens.css` (handoff §2, light and dark), `base.css`,
  `components.css`.

**The timer** is one `requestAnimationFrame` loop reading the clock, never
accumulating ticks, so a backgrounded tab or a locked phone comes back correct.

**Storage is local-first.** Rounds and settings live in localStorage, audio in
IndexedDB. That is the whole store while signed out, and stays the source of
truth when signed in.

## Accounts and sync (optional)

With no keys configured, the app runs entirely on the device and the account
UI stays hidden. To turn sync on:

1. Create a project at supabase.com.
2. Run `supabase/schema.sql` in the SQL editor. It creates the `sessions`
   table, a private `recordings` bucket, and row-level security so nobody can
   read anyone else's rounds.
3. `cp .env.example .env.local` and fill in the Project URL and anon key from
   **Project Settings → API**. Both are safe in a browser; row-level security
   is what protects the data. `.env.local` is gitignored.
4. Restart the dev server, then **Settings → Sign in**.

Sync runs on start, when the connection returns, when the tab comes back and
after a round. Conflicts settle by `updatedAt`, last writer wins; deletes
travel as tombstones so another device cannot hand a round back.

## Feedback (optional)

`api/feedback.ts` sends a recording to Groq and returns a transcript plus three
short pieces of writing. The counted half of the card — words per minute,
filler and vague words — is derived from that transcript in the browser, with
no model involved, so it still works if the writing fails.

Set `GROQ_API_KEY` (from console.groq.com) in Vercel's environment variables,
and in `.env.local` for local work. **No `VITE_` prefix**: anything with it is
compiled into the JavaScript every visitor downloads. One key covers both the
speech and text models; `GROQ_STT_MODEL` and `GROQ_TEXT_MODEL` override the
defaults if the ids move.

Functions do not run under `npm run dev`. Use `vercel dev` to exercise the
feedback path locally.

## Deploying

Static hosting; `vercel.json` carries the SPA rewrites, cache headers and a
Content-Security-Policy that refuses inline scripts (hence
`public/theme-init.js`).

```bash
npx vercel --prod
```

Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under the project's
environment variables if sync is wanted in production, then redeploy.

## Testing it properly

Two things only a real device answers, both flagged in `build-plan.md`:

- **Safari audio.** iOS records mp4 rather than webm. Record a round on the
  phone and play it back.
- **The locked screen.** Lock the phone mid-round for 20 seconds. The timer
  should be right on return, and Review should admit it if iOS stopped the
  recording early.

The microphone needs HTTPS or localhost, so phone testing means a deploy.
