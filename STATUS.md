# Where things stand — 20 September 2026

A handover note, written at the end of the first build session. The durable
documents are `stand-up-handoff.md` (behaviour), `build-plan.md` (milestones
and decisions) and `README.md` (how to run it). This file is just the state of
play, and should be deleted or rewritten once it stops being true.

## Built and committed

M1 through M5, plus M2.5, in eight commits on `main` and two branches:

| Milestone | What | State |
| --- | --- | --- |
| M1 | Home, Setup, Prep, Speaking, the timer, routing | on `main` |
| — | Topic reveal as a seven-card draw | on `main` |
| M2 | Recording, Review, playback, ratings, notes, delete | on `main` |
| M3 | History, trend card, delete controls, Settings | on `main` |
| M4 | Accessibility pass, PWA, `vercel.json` | on `main` |
| M5 | Optional accounts and sync (Supabase) | branch `accounts-and-sync`, **PR #1 open** |
| M2.5 | Feedback card and `api/feedback.ts` (Groq) | branch `feedback-card`, **no PR yet** |

`feedback-card` is stacked on `accounts-and-sync`, so merge PR #1 first.

## Configured

- **GitHub:** `carlo-cortez/stand-up`. `origin/main` is at M4; the two branches
  above carry the rest.
- **Supabase:** project ref `zgzwnpjcdywzamyonefn`. `supabase/schema.sql` has
  been run — the `sessions` table and the private `recordings` bucket both
  answer, and row-level security returns nothing to an anonymous caller.
- **Vercel:** project `impromptu-speech-web-app` under `cotriis-projects`.
  Note the project name does not match the repo name.
- **Environment variables** set in Vercel:
  `GROQ_API_KEY` (Production, Preview), `VITE_SUPABASE_ANON_KEY` (Production,
  Preview), `VITE_SUPABASE_URL` (**Production only** — see gaps).
- **Local:** `.env.local` holds the two Supabase values. The Groq key is not in
  it, so the feedback path cannot be exercised locally until it is.

## Gaps and next actions

1. **`VITE_SUPABASE_URL` is missing from Preview.** Preview deploys will behave
   as though no account were configured, because Vite bakes these in at build
   time. Add it to Preview.
2. **Not deployed yet.** Nothing has been published. Until it is, the phone
   cannot be tested at all: the microphone needs HTTPS.
3. **Supabase redirect URLs** still point at localhost only. Add the Vercel URL
   under Authentication → URL Configuration, or signing in from the phone will
   bounce.
4. **Google sign-in** is built but unconfigured. It needs a Google Cloud OAuth
   client, with `https://zgzwnpjcdywzamyonefn.supabase.co/auth/v1/callback` as
   the redirect URI, and the client id and secret pasted into Supabase's Google
   provider. The secret belongs only there — never in this repo.
5. **Consider Git-based deploys** rather than `npx vercel` from the laptop:
   every push deploys, and every PR gets a preview URL to open on the phone.

## Untested, and worth distrusting until tried

- **Safari audio.** iOS records mp4, not webm. Recording and playback have only
  been exercised in Chrome, with a synthetic tone standing in for the mic.
- **The locked screen.** Lock the phone mid-round: the timer should recompute
  correctly, and Review should admit it if iOS stopped the recording early.
- **The Groq call.** Everything either side of it was tested with the call
  stubbed. The filler count is the number to be sceptical of — Whisper is
  trained to tidy disfluencies away, which is exactly what this app counts.
- **Sign-in round trips and two-device sync.** Both need a deploy first.

## Open design questions

Unchanged, and deliberately so: the five in `stand-up-handoff.md` §11, plus
whether the card draw stays charming on the twentieth round. All of them need
rounds rather than code. The build plan's advice — use it for a week before
building more — has been outrun by five milestones and is now overdue.
