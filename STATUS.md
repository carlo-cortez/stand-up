# Where things stand — 20 September 2026 (session three)

A handover note, kept current across build sessions. The durable
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
| M5 | Optional accounts and sync (Supabase) | merged, PR #1 |
| M2.5 | Feedback card and `api/feedback.ts` (Groq) | merged, PR #2 |

Merged since:

- **PR #3, `fix-feedback-runtime`** — the deployed function crashed on every
  request (`request.formData is not a function`: Vercel's Node runtime passes
  a Node request, not a Web one). Fixed and verified against production.
- **PR #4, `mic-reminder`** — a line on the draw screen before the browser
  asks for the microphone, and a different one when it is blocked.

Open:

- **`find-the-category`** — Home now names the round the big button will play,
  with Change beside it. Open question 8, answered.

## Configured

- **GitHub:** `carlo-cortez/stand-up`. `origin/main` carries everything
  through PR #4; `find-the-category` is the only branch ahead of it.
- **Supabase:** project ref `zgzwnpjcdywzamyonefn`. `supabase/schema.sql` has
  been run — the `sessions` table and the private `recordings` bucket both
  answer, and row-level security returns nothing to an anonymous caller.
- **Vercel:** project `impromptu-speech-web-app` under `cotriis-projects`.
  Note the project name does not match the repo name. Live at
  https://impromptu-speech-web-app.vercel.app
- **Environment variables** set in Vercel:
  `GROQ_API_KEY` (Production, Preview), `VITE_SUPABASE_ANON_KEY` (Production,
  Preview), `VITE_SUPABASE_URL` (**Production only** — see gaps).
- **Local:** `.env.local` holds the two Supabase values. The Groq key is not in
  it, so the feedback path cannot be exercised locally until it is.

## Gaps and next actions

1. **`VITE_SUPABASE_URL` is missing from Preview.** Preview deploys will behave
   as though no account were configured, because Vite bakes these in at build
   time. Add it to Preview.
2. **Deployed, and level with `main` again.** The app is live, the service worker is serving it, and
   `/api/feedback` answers correctly: 400 without audio, 405 on GET, and Groq's
   own "is it a valid media file?" for a bogus one — which proves the key works
   and Groq is reachable. A stale service worker will keep showing an old build
   until the tab or home-screen app is fully closed and reopened. The category
   line is not deployed yet — it needs a deploy once its branch merges.
3. ~~Supabase redirect URLs point at localhost only.~~ Done, 20 September.
   Site URL is the Vercel domain and the allow-list takes a preview wildcard;
   both confirmed by probing the auth server.
4. **Google sign-in** is built but unconfigured. It needs a Google Cloud OAuth
   client, with `https://zgzwnpjcdywzamyonefn.supabase.co/auth/v1/callback` as
   the redirect URI, and the client id and secret pasted into Supabase's Google
   provider. The secret belongs only there — never in this repo. The privacy
   policy URL Google asks for is `/privacy`; the support and developer emails
   go in Google's own consent-screen form.
5. **Setup discards edits unless you start from it.** Surfaced by the fix for
   the category question: Home's new line reads the saved defaults, but Setup
   only saves when its own button starts a round. Change a pill, press back,
   and the line still reads the old round. Either save on change, or say on
   Setup that the choices take effect when the round starts.
6. **Consider Git-based deploys** rather than `npx vercel` from the laptop:
   every push deploys, and every PR gets a preview URL to open on the phone.

## Untested, and worth distrusting until tried

- **Card sounds on a real phone.** Verified only by instrumenting the audio
  calls in Chrome: what is scheduled, when, and that the switch silences it.
  Nobody has heard them. Two things to listen for — whether noise bursts pass
  for cards or sound like static, and whether, on iOS, playing sound before
  the mic opens drops the recording's volume or moves playback to the
  earpiece. If recording misbehaves, turn Card sounds off first to rule it out.

- **Safari audio.** iOS records mp4, not webm. Recording and playback have only
  been exercised in Chrome, with a synthetic tone standing in for the mic.
- **The locked screen.** Lock the phone mid-round: the timer should recompute
  correctly, and Review should admit it if iOS stopped the recording early.
- **A real recording through Groq.** The endpoint is proven, but no actual
  speech has been through Whisper. The filler count is the number to be
  sceptical of — Whisper is trained to tidy disfluencies away, which is exactly
  what this app counts.
- **Sign-in round trips and two-device sync.** Both need a deploy first.

## Open design questions

Unchanged, and deliberately so: the five in `stand-up-handoff.md` §11, plus
whether the card draw stays charming on the twentieth round. All of them need
rounds rather than code. The build plan's advice — use it for a week before
building more — has been outrun by five milestones and is now overdue.
