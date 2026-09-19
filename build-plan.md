# Stand Up — build plan

Companion to `stand-up-handoff.md` (what to build) and `phase-1-brief.md` (how to start). This is the sequence: what gets built when, what "finished" means at each step, and which decisions get made at which point.

Phases 1 and 2 are planned in detail because they are designed and understood. Phases 3 to 5 are sketched deliberately thinly — planning them now would be guessing, and the first weeks of real use will answer more than any amount of speculation.

---

## Ground rules

**One milestone at a time, in order.** Each ends with something you can actually use. Resist starting the next before the current one is in daily use for at least a few days — the whole point of this app is that you practice with it, and using it is how the open questions get answered.

**Git from the first commit.** Before any app code: `git init`, a `.gitignore` covering `node_modules`, `dist` and `.DS_Store`, and a first commit containing the four documents and the `design/` folder as they stand. Every milestone below ends with a commit and a tag (`m1`, `m2`, …) so you can always get back to a working version.

**The documents are living.** When a decision changes during the build — and some will — update `stand-up-handoff.md` in the same commit as the code. A spec that drifts from the app is worse than no spec, because it makes future-you confidently wrong.

**Come back to design when the question is visual or behavioural**, not when it is technical. Bring the running app; comparing it against the canvas is quick and catches things a spec can't describe.

---

## M0 — Repository (half an hour)

Scaffold and nothing else. `npm create vite@latest` with the React + TypeScript template, React Router installed, the folder structure from the Phase 1 brief created with empty files, `tokens.css` filled in completely from handoff §2 including the dark set, `base.css` with the reset, focus ring and the two Google Fonts loading.

**Done when** `npm run dev` serves a blank page in the right background colour, with the right fonts, and the colour flips correctly when you toggle your OS between light and dark. That is a real test — it proves the token layer before anything depends on it.

Commit, tag `m0`.

---

## M1 — The practice loop (Phase 1)

This is `phase-1-brief.md`. Home, Session setup, Prep and Speaking. No recording, no Review, no History.

Suggested order within the milestone, each a sensible stopping point:

1. **Components before screens** — Button, SegmentedControl, Card, CountdownRing, ProgressBar, TimingChip. Build them against the artboard values directly; they carry most of the design's identity.
2. **`useRoundTimer`** — the rAF loop, tab-hidden behaviour, the heartbeat. Test it in isolation with a throwaway page before wiring it to a screen. Timer bugs found inside a finished UI are miserable to chase.
3. **Prep and Speaking** — the two screens the brief said carry the whole experience. Build them at 390px first, then the desktop layouts.
4. **Home and Setup** — simpler, and by now the components exist.
5. **Routing, back button, refresh recovery** — handoff §9. Do this last but do not skip it; it is what separates a web app from a demo.

**Done when** you can complete a full round start to finish, on your phone, without touching a keyboard: the loop in the brief's acceptance list, at all three widths, in both themes, with `prefers-reduced-motion` honoured.

Commit, tag `m1`. **Then use it for a week.**

---

## M2 — Recording and Review (Phase 2, first half)

Now the round produces something to look at.

1. **Recording** — `getUserMedia` and `MediaRecorder` wired into the Speaking screen, starting on entry to speaking and stopping on finish. The mic-blocked path from handoff §4.2 including the Setup variant and the "Recording off" indicator. Do the permission-denied path in the same pass as the happy path; retrofitting it later always produces a worse version.
2. **Storage** — IndexedDB for blobs, localStorage for session metadata, the `Session` shape from handoff §6. Quota handling and the private-browsing fallback from §9.
3. **Review** — the screen, playback, the four self-ratings, notes, save-on-change. The breakdown card in its empty state only, at its reserved height.
4. **Delete recording** — the bottom sheet, focus trap, Escape, and the promise it makes: audio goes, ratings and notes stay. Verify that promise actually holds in storage.

**Done when** a round ends on Review, you can play yourself back, rate the round, write a note, leave, come back, and find it all still there. And when deleting the audio leaves the ratings intact.

Commit, tag `m2`. **Use it for another week** — this is the milestone most likely to change your mind about the design, because hearing yourself back is a different experience from imagining it.

---

## M2.5 — The round breakdown (the counted half)

Transcription, and the numbers that fall out of it. No language model, no bill.

1. **Transcription** — a Vercel or Cloudflare function holding the Groq key, taking the audio blob and returning text with word timestamps. The key never reaches the browser. Keep it behind a single `transcribe()` so the provider can change later without touching anything else.
2. **The numbers** — words per minute from word count over round duration; filler and vague words matched against the fixed lists in the design brief. Plain string work, fully testable, no network beyond step 1.
3. **The card** — `ReviewBreakdownReady` on the canvas: three tiles each carrying a delta against your own average, the flagged-word chips, and filler counts across your last five rounds. Plus its idle, loading and offline states beside it.
4. **Safari audio** — iOS `MediaRecorder` gives you mp4/AAC, not the webm/opus Chrome gives you. Confirm on the phone that the blob Groq receives is one it accepts, before trusting anything else in this milestone.
5. **The written half, once the numbers are trustworthy** — one thing that went well, a sentence of yours rewritten sharper, one "try next time". Groq serves open-weight text models on the same free tier and the same key, so this is a second call in the same function, not new infrastructure. Put it behind `writeFeedback()`. Budget the time for prompt work, not for the bill: the card's tone is demanding — one focus, never a list of faults — and smaller models hold that loosely.

**Done when** a round ends, you tap once, and ten seconds later you know you said "um" seven times, that this is four fewer than usual, and one plain sentence about what to try next time.

Commit, tag `m2.5`.

**The known soft spot.** Whisper is trained to tidy disfluencies away, so the filler count will run low on some rounds. Seed the decoder prompt with fillers to bias it back. If the number still cannot be trusted after twenty rounds, either move to a speech API built for disfluencies (Deepgram, AssemblyAI) or drop the tile and leave filler words to your own self-rating, which is already on the screen.

---

## M3 — History and your data (Phase 2, second half)

1. **History** — the list, rows linking to a past Review, the empty state.
2. **The trend card** — weekly counts and the one plain-language sentence. Keep it as small as the design has it; the temptation to add charts here is strong and wrong.
3. **Delete controls** — the per-round sheet with its three options, plus "Delete all recordings" and "Delete all data" in Settings. The brief treats these as a promise to the user, so they get tested properly: delete a round, reload, confirm it is gone from both stores.
4. **Settings** — theme override, the delete actions, nothing else yet.

**Done when** twenty rounds in, History tells you something true about your practice, and every delete does exactly what it says.

Commit, tag `m3`.

---

## M4 — Make it real (no new features)

The milestone people skip, and the one that decides whether you keep using it.

- **Accessibility pass** against handoff §7: keyboard through every flow, the live-region announcements actually announcing, contrast spot-checked on the tinted Speaking backgrounds, 44px targets verified on a real phone.
- **Service worker and manifest** so it installs to your home screen and runs offline. For a phone-first practice app this matters more than it sounds — an app behind a URL bar gets opened less.
- **Deploy.** Static hosting, any provider. Put it on a real domain or subdomain so it is two taps away.
- **Cross-browser check** on Safari especially, where `MediaRecorder` behaviour and IndexedDB in private windows differ most.
- **Privacy and hardening.** Note somewhere in the app that recordings stay on the device. Add a Content-Security-Policy at the host, and decide whether to self-host the Google Fonts.
- **Automated tests for the risky logic.** Vitest for `useRoundTimer`, topic selection and the `format` helpers (ideally added at M1, when the timer is written).

**Done when** it is on your home screen and you reach for it without thinking about it.

Commit, tag `m4`. At this point the brief's Phases 1 and 2 are complete and the app is genuinely yours to use.

---

## Decision checkpoints

The five open questions at the end of the handoff resolve at specific moments, not all at once:

| Question | Decide at | How you'll know |
| --- | --- | --- |
| Yellow threshold formula | End of M1 | After a dozen rounds at 1, 2 and 3 minutes. If it startles you at one minute or arrives too late at three, the formula is wrong. |
| "Start wrapping up" vs a neutral time reading | End of M1 | Does the nudge help you land, or break your sentence? |
| Difficulty in the Prep chip | End of M1 | Do you ever look at it once the topic is on screen? |
| Ring above or below the topic | End of M1 | Which one you read first, without trying. |
| Keep abandoned rounds in History | End of M3 | Whether you abandon rounds often, and whether seeing them helps or nags. |

Bring these back here with the running app and we'll settle them against the canvas.

---

## Phases 3 to 5 — deliberately unplanned

**Phase 3, better writing.** The whole feedback card ships free at M2.5 on Groq. What is left for later is quality: if the open-weight model's observations stay generic, or its rewrites lose your meaning, pointing `writeFeedback()` at Claude is a one-line change and pennies a month at a round a day. That is the only part of this app with a bill attached, and it is worth paying only once you know the writing is what's holding the card back. Judge it after twenty real rounds, not before.

**Phase 4, progress and habit.** Streaks, a daily topic, practice modes. Worth designing only once History has real data in it, because the trends worth showing will be obvious by then and are not obvious now.

**Phase 5, wider audience.** Accounts, sync, onboarding. Nothing here until you have used the app for months and know whether anyone else wants it. The navigation already leaves room, which is all that is needed today.

---

## What could go wrong

**The timer.** Background tabs, phone screen locks, and Safari's throttling are where this app is most likely to misbehave, and the failure is invisible in testing because you are looking at the screen. Test with the phone locked mid-round, deliberately, at M1 and again at M4.

**Audio on Safari.** Codec support and blob handling differ enough to matter. Find out at M2, not at M4.

**Scope creep into the written feedback.** The counted half is cheap and deterministic, which is why it ships at M2.5. The written half is the most interesting part and the least necessary — the practice loop is the product. If you find yourself tuning feedback prompts before M3 is in daily use, that is the warning sign.

**The app being good and you not using it.** The real risk. M4 exists for this reason — an installed app on a home screen gets opened, a bookmarked URL does not.
