# Stand Up — design handoff for implementation

Companion to the design canvas "Stand Up — Calm studio". This document is the source of truth for tokens, component behaviour, state machines and copy. Where the canvas and this document disagree, the canvas wins on layout and this document wins on behaviour.

Scope here is Phase 1 (core practice loop) and Phase 2 (recording, self-review, history, and the feedback card at M2.5). Phase 4–5 features are described only where a layout or data decision must leave room for them.

---

## 1. Stack assumptions

Mobile-first responsive web app, no accounts, no backend. Everything runs in the browser.

- Rendering: any modern framework or none. State is small enough for plain component state plus one store.
- Persistence: IndexedDB for audio blobs, localStorage for settings and session metadata. That is the whole store while signed out, and stays the source of truth even when signed in — a round is written here the moment it ends, and reaches the server when it can.
- Accounts (brought forward from Phase 5) are optional: with none, nothing leaves the device. Signed in, rounds and recordings sync to Supabase — Postgres behind row-level security, audio in a private per-user bucket. Conflicts settle by `updatedAt`, last writer wins; deletes travel as tombstones so another device cannot hand a round back.
- Audio: `MediaRecorder` with `getUserMedia({ audio: true })`. Store as `audio/webm;codecs=opus` where supported, fall back to `audio/mp4`.
- Timers: a single `requestAnimationFrame` loop driven by `performance.now()` deltas, not `setInterval`, so drift and background-tab throttling don't accumulate. Persist `startedAt` so a refresh mid-round can recover or abandon cleanly.
- Breakpoints: two. Below 900px, the mobile layouts. From 900px to 1180px, a tablet band — the mobile layout centred in a 560px column, with Speaking allowed to grow its timer to 150px because it is still being read from arm's length. At 1180px and up, the desktop layouts, of which every screen now has one on the canvas.
- Desktop content is capped and centred rather than stretched: 880px for Session setup, 820px for Prep's centre column, 1200–1330px for the two-column Home, Review and History layouts. Nothing spans a 27-inch monitor edge to edge.

---

## 2. Design tokens

### Colour — light

| Token | Value | Use |
| --- | --- | --- |
| `--ground` | `#FAF8F3` | App background |
| `--surface` | `#FFFFFF` | Cards, sheets, inputs |
| `--surface-sunken` | `#F4F6EF` | Stat tiles, nested blocks |
| `--surface-muted` | `#F6F5EE` | Inactive / not-yet-available cards |
| `--border` | `#DFE3D8` | All 1px borders |
| `--text` | `#22302A` | Primary text |
| `--text-secondary` | `#41504A` | Secondary text |
| `--text-muted` | `#5A6960` | Captions, labels (4.5:1 on ground) |
| `--accent` | `#6E8C74` | Rings, bars, dots — graphics only |
| `--accent-strong` | `#3F5A48` | Primary buttons, link and control text |
| `--accent-wash` | `#EAEFE5` | Badge and letter-chip fills |
| `--danger` | `#9A4F36` | Destructive button fill |
| `--danger-text` | `#8A4A33` | Destructive text button |
| `--text-disabled` | `#65736B` | Disabled control text — 4.7:1, because a disabled line still says something |

### Colour — dark

| Token | Value |
| --- | --- |
| `--ground` | `#151A16` |
| `--surface` | `#1D241E` |
| `--surface-sunken` | `#232C24` |
| `--border` | `#2E382F` |
| `--text` | `#EDF0E8` |
| `--text-secondary` | `#C3CDC4` |
| `--text-muted` | `#A2AFA4` |
| `--accent` | `#90B198` |
| `--accent-strong` | `#A8C6AF` (fill; text on it is `#15201A`) |
| `--danger-text` | `#D9A18C` |
| `--text-disabled` | `#8A968C` |

Dark mode follows `prefers-color-scheme` with a manual override in Settings. Note the inversion: in light mode the primary button is a dark sage fill with light text; in dark mode it is a light sage fill with dark text. Do not simply swap the palette — the button pair is defined explicitly above.

### Timing lights

Each state is carried three ways at once: page tint, progress-bar colour, and a labelled chip with its own shape. Colour never carries meaning alone.

| State | Page tint | Bar / chip fill | Chip text | Shape | Label |
| --- | --- | --- | --- | --- | --- |
| On track | `#F2F5EC` | `#6E8C74` / `#E1EBD9` | `#2F4A38` | circle | "On track" |
| Wrapping up | `#FAF3E4` | `#C2A24A` / `#F4E6C6` | `#5E4A17` | triangle | "Start wrapping up" |
| Overtime | `#F9EDE8` | `#B4664F` / `#F3DCD3` | `#6E3826` | square | "Past your target" |

Tint changes cross-fade over 600ms; under `prefers-reduced-motion` they cut instantly. Never flash or pulse the background.

### Motion

Two curves for everything that moves, so the draw, the arrival and the sheet read as one system: `--ease-out` `cubic-bezier(0.2, 0.8, 0.2, 1)` for anything entering or settling, and `--ease-in-out` `cubic-bezier(0.45, 0, 0.25, 1)` for anything that travels. Under `prefers-reduced-motion` every duration drops to zero, so each animation lands on its final state at once.

### Typography

Two families, both Google Fonts.

- Display / topic: **Newsreader** 400 and 500, fallback `Georgia, serif`. Used for topics, screen headlines, the wordmark, and the AI rewrite line. Nowhere else.
- UI: **Hanken Grotesk** 400/500/600/700, fallback `ui-sans-serif, system-ui, sans-serif`. Everything else.

| Role | Size / line-height / weight | Family |
| --- | --- | --- |
| Topic, prep screen | 34 / 1.22 / 400 (30 when the structure hint is open) | Newsreader |
| Topic, speaking screen | 19 / 1.32 / 400 | Newsreader |
| Topic, review + history rows | 24 desktop, 19–18 mobile / 1.3 / 400 | Newsreader |
| Screen headline | 42 home, 30 review, 28 empty state / 1.1–1.25 / 400 | Newsreader |
| Timer, mobile | 108 / 1 / 600, `letter-spacing: -0.04em`, `tabular-nums` | Hanken Grotesk |
| Timer, desktop | 208 / 0.95 / 600, `letter-spacing: -0.05em`, `tabular-nums` | Hanken Grotesk |
| Prep seconds | 42 / 1 / 600, `tabular-nums` | Hanken Grotesk |
| Button | 17–20 / 600 | Hanken Grotesk |
| Body | 15–17 / 1.45 / 400 | Hanken Grotesk |
| Caption | 13 / 1.35 / 400–600 | Hanken Grotesk |
| Section label | 12 / 700, `letter-spacing: 0.12em`, uppercase | Hanken Grotesk |

Every element showing a clock value uses `font-variant-numeric: tabular-nums` so digits don't jitter as they count.

### Spacing, radius, layout

- Spacing scale: 4, 8, 10, 12, 14, 18, 22, 26, 30.
- Screen padding: `60px 24px 28px` on mobile. The 60px top is deliberate — it clears the device status bar. Never draw a status bar.
- Radius: 12 small controls, 14 inputs and segmented items, 16–18 buttons, 18–20 cards, 28 top corners on bottom sheets, 999 pills.
- Desktop padding: `40px 56px 48px`. Review desktop is a 2-column grid, `repeat(2, minmax(0, 1fr))`, gap 32.
- Borders are always 1px `--border`. No shadows anywhere; elevation comes from the border and the ground/surface contrast. The bottom sheet is the one exception and it uses a scrim, not a shadow.

---

### Logo

Ace stepping out of the deck, peeking in from the lower right: Ace himself — the white card with his grey-green border, dot eyes and small smile (§3) — leaning back 9 degrees as he does in empty History, in front of a card back at 2 degrees (darker green `#2F4636` with a light rule printed inside, like the backs in the card draw), on the app's green `--accent-strong`. Cute by scale and crop rather than by detail, and the same character the app shows, so the icon and the app introduce each other. It follows Ace's rules: a white card with dark features, no limbs.

The source is `design/logo/mark.svg`, on a 1536 grid. Every PNG in `public/` is drawn from it by `sh design/logo/export.sh`, using only macOS's own renderer: full-bleed squares for iOS and Android, which round the corners themselves. The maskable icon uses the mark unscaled — the face sits 23% from centre, inside the 40% circle Android keeps, and the cards are meant to be cropped.

`public/favicon.svg` is kept by hand. At 16px the icon's face would be half a pixel wide, so the tab version draws the same composition on a 64 grid with the face about 2.5 times larger. Clear at 32px and still there at 16px. The card back's printed rule is left out of the tab version, where it would be a sub-pixel smudge.

The header wordmark stays as text.

## 3. Components

### Button

| Variant | Height | Fill | Text | Radius |
| --- | --- | --- | --- | --- |
| Primary | 56 (60 on Speaking and Setup, 68 on Home) | `--accent-strong` | `--ground` | 16–20 |
| Secondary | 52 | `--surface`, 1px border | `--accent-strong` | 16 |
| Text | 44 | none | `--accent-strong` | — |
| Destructive | 56 | `--danger` | `#FDF7F4` | 16 |
| Destructive text | 44 | none | `--danger-text` | — |
| Pill | 44 | `--surface`, 1px border | `--accent-strong` | 999 |

All interactive elements are at least 44px in their smallest dimension. Icon-only buttons are exactly 44×44 with an `aria-label`. Focus is a 2px `--accent-strong` outline at 2px offset, never removed.

### Segmented control (difficulty, prep time, speaking time, ratings)

A `<fieldset>` with a `<legend>`, containing one `<label>` per option, each wrapping a visually-hidden `<input type="radio">`. Selected: `--accent-strong` fill, `--ground` text, matching border. Unselected: `--surface` fill, `--border`, `--text-secondary`. Do not build these from divs — keyboard arrow-key navigation within the group comes free with real radios.

### Countdown ring

132px outer, `r=58`, `stroke-width: 8`, rotated -90°. Track `#E4E7DD` light / `#2B342C` dark; progress `--accent`, round cap. `stroke-dasharray: 364.42`, and `stroke-dashoffset = 364.42 × (elapsed / total)`. Seconds remaining sit in the middle at 42px with the label "PREP" beneath. Shrinks to 112px when the structure hint is open.

Under `prefers-reduced-motion`, swap the ring for the segmented bar on the reduced-motion artboard: 15 blocks, `flex-grow: 1`, 10px tall, radius 3, one block dropping every `total / 15` seconds. No sweeping animation, no per-frame updates — a discrete change once every two seconds at the 30s setting.

### Progress bar (Speaking)

Full width, 8px mobile / 10px desktop, radius 999, track `#E0E6D6`, fill in the current timing-light colour, width = elapsed / target, capped at 100%. In overtime it stays full and the colour has already changed.

### Bottom sheet (destructive confirmations)

Scrim `rgba(24, 34, 27, 0.5)` over the dimmed screen. Sheet: `--ground`, top radius 28, padding `28px 24px 32px`, a 44×4 grab handle centred at the top. Serif headline, body copy that states plainly what is lost, then the destructive action, then the safe alternative, then Cancel. The destructive action is never the visually dominant element on the screen behind it.

Focus moves into the sheet on open, is trapped while it is open, and returns to the triggering control on close. Escape cancels.

### Card

`--surface`, 1px `--border`, radius 20, padding 18 (24 on desktop). A "not available yet" card (the feedback card before M2.5) uses `--surface-muted` with border `#E6E4DA` and a "Not on yet" badge. It reserves its height so the page does not jump when it later fills in.

---

### Ace, the mascot

A plain white playing card with a face — two dot eyes and a small smile, nothing else — standing on the same sage line as the logo. `src/components/Ace.tsx`, two poses: `lean` (tilted against the line, waiting) and `hop` (upright, eyes smiling, one small squash-and-hop on arrival).

Rules, each learned the hard way or written in from the start:

- **No limbs.** The first draft had thin dark limbs behind a white face panel and a wide grin, which reads as minstrel caricature and the rubber-hose cartoons that came out of it. Ace is one material and moves by tilting and hopping. Any new pose keeps to that — no arms, no legs, no gloves, and the smile stays small.
- **Always a white card with dark features, in both themes.** Not `--surface`, which goes dark green in the dark theme and would turn Ace into a dark card with light eyes and mouth — the same trope from the other side.
- **Never reacts to how a round went.** No sad Ace, no proud Ace. It appears only where §8 allows playfulness — empty states and the celebration line — and never in error states, where playfulness reads as evasive; that rules out the offline feedback card.
- **Never on Prep or Speaking**, where it would compete with the topic and the timer.

Where it appears: empty History (`lean`, in place of the old line drawing) and beside Review's celebration line (`hop`, only on arrival from a round — reopening a past round from History shows the line without Ace). Reduced motion zeroes the hop, so Ace simply lands.

Show a new pose to someone else before it ships. The first draft's problem was invisible to the person who drew it.

## 4. Screens

### 4.1 Home

Two states on the canvas: returning and first run.

Returning shows the wordmark and a settings button — a cog, eight teeth around a small circle. (The artboard drew a sun under that label; it reads as a brightness toggle, and Settings now holds the account and the delete-everything actions, so the app uses a cog and the canvas should follow.) Then the headline "The floor is yours.", a one-line summary of recent activity, the dominant "Start practicing" button at 68px, directly under it a quiet line naming the round that button will play — "Surprise me · Medium · 60s, 2 min" — with a Change link to Setup beside it, then a "Same as last time" button that repeats the last settings verbatim (label it with those settings, e.g. "Same as last time · Surprise me, 60s, 2 min", and hide it entirely when those settings match the line above, since it would then do exactly what Start does), a Topic of the day card that jumps straight into Prep with that topic, and a History row at the bottom showing the round count and the date of the last round.

First run replaces the activity line and the Topic of the day card with a three-step explainer and a quiet "No rounds yet" row where History would be. The Start button is identical in both — its position must not move between states.

**Add to home screen.** The app has been installable since M4; this card says so. It appears on Home only once there's at least one round (the first-run explainer owns that space), after the Topic of the day card so Start never moves, and "Not now" puts it away for good. Settings always carries the same card until the app is installed. Two behaviours: where the browser offers an install (Chromium's `beforeinstallprompt`, held and fired from our own button) the card has an "Add to home screen" button; on iPhone and iPad, where Safari never offers one, it explains: "In Safari, tap Share, then Add to Home Screen." Declining the browser's prompt leaves the card for that visit with "It's here in Settings whenever you want it," and Home doesn't ask again. Nothing shows once installed, or where there's nothing useful to offer (Firefox, desktop Safari). `src/lib/install.ts`, `src/components/InstallCard.tsx`.

Home must grow into a Phase 4 dashboard without a redesign: keep the Start button anchored in the vertical centre band and let cards accumulate below it.

Desktop splits into two columns: the headline, Start and "Same as last time" on the left at a 76px headline; Topic of the day and a richer History summary on the right. History moves up into the header as a text link as well, since a desktop header has room for navigation that a phone header does not.

### 4.2 Session setup

Skippable by design — Home's Start button uses the stored defaults and goes straight to Prep. This screen is reached from the Change link beside Home's round line, or by editing settings.

Fields: category (7 categories plus "Surprise me", which mixes all of them, as the default), difficulty (Easy / **Medium** / Hard), prep time (15 / 30 / **60** seconds), speaking time (1 / **2** / 3 minutes), and a recording toggle (on by default).

Desktop keeps a single 880px card with the three time-and-difficulty groups side by side in a 3-column grid, categories wrapping above them, and the recording toggle below. A line beside the Start button states what the phone version leaves implicit: these choices become the defaults, and Home's big button skips this screen next time.

Mic-blocked variant: request the mic only when the user first turns recording on or starts a recorded round, never on app load. If `getUserMedia` rejects with `NotAllowedError`, show the blocked card, force the toggle off and disabled, and change the primary button to "Practice without recording". Offer "Ask again" (re-request; on most browsers a hard block means the user must change a site setting, so also link to instructions). Nothing about this state should read as an error the user caused.

### 4.3 Topic reveal and Prep

Chrome is deliberately thin: a category and difficulty pill, an end-session button, and nothing else.

The ring counts prep down. The topic sits centred in Newsreader. The structure hint is collapsed by default behind "Show structure hint" and remembers the user's choice for subsequent rounds. Expanded, it shows PREP — Point ("Answer in one sentence."), Reason ("Why you land there."), Example ("One story, case, or number."), Point ("Say it again, shorter.") — and the ring shrinks to 112 with the topic dropping to 30px so the buttons stay put.

**A topic you've answered before.** With 35 topics, and a single one on some category-and-difficulty pairs, topics come round again. When one does, a quiet line sits under it: "You've answered this one before, on Tuesday. Try a different angle, or draw another." — or "…two times, most recently on Tuesday." The "or draw another" half only appears while the redraw is unused. "Answered" means a saved round of at least 10 seconds: a false start doesn't count, and a retake doesn't either, since retaking deletes the round. It's counted when the round starts, so it's only ever about earlier rounds, and it's on Prep alone — never on Speaking, where it would be one more thing to read. Home's Topic of the day card carries the same fact as a small tag: "Answered on Tuesday".

**Topic reveal: draw a card.** A new topic never just appears; the user draws it. A deck of seven face-down cards arrives as a loose pile under "Pick a card", riffles twice — the pile splitting left and right and falling back together — and spreads into a fan like a hand of cards, about 1.8 seconds in all, after which the cards can be tapped. The cards pivot around a point three card-heights below them, 7° apart, which leaves each one a tappable slice of about 44px on a phone. Deep sage backs with an inset rule and a four-point star, light sage in dark mode; and the pill shows what was asked for ("Surprise me · Medium"), not what came up. The draw is untimed: nothing counts until a card is picked, and the caption says so — "Your prep time starts once the topic is showing." Every card holds the same, already chosen topic; the pick is a ritual, not a choice. Tapping a card plays a 1.7-second sequence: it straightens out of the fan and lifts, the title fades aside, and it flips to show the category and difficulty ("Wildcard · Medium"), a first small reveal; the rest of the deck drops away; it holds a beat, then dissolves upward as the prep screen arrives. The picked card moves in three layers, each doing one thing: it swings back along the fan's arc to upright, lifts and grows around its own centre, and flips; the rest of the deck falls away from it outward. The prep screen then arrives one beat at a time on the same curve: the topic rises into place, a short sage rule sweeps in beneath it and fades, the ring fades up, then the hint and the actions; the pill's text cross-fades from what was asked for to what came up. All motion uses two shared curves, `--ease-out` and `--ease-in-out`. Prep starts the moment the card sequence ends, so the suspense never costs thinking time. Cards are real buttons ("Card 1 of 3"), lift on hover and focus, and are drawn with Enter or Space. There is no draw for a topic the user picked by hand (Topic of the day). Under `prefers-reduced-motion` the cards are still dealt but nothing animates — the tap goes straight to prep.

"Start now" begins Speaking immediately. "Draw another · 1 left" is allowed once per round: it reshuffles and spreads the six cards left, with a new topic under them. Once used, it becomes a disabled, friendly line — "Skip used — this one's yours" — rather than a greyed-out scold. When prep reaches zero, transition to Speaking automatically, with no interstitial.

Long topics wrap to four lines at 34px within the 342px content width; the artboard with the socks topic is the wrap test. Do not truncate a topic, ever.

Desktop moves the structure hint out of the vertical stack and into a 340px card to the right of the centre column, so opening it no longer costs the topic any size — the topic sits at 52px and the ring at 168px. On desktop the hint is open by default, because the space is free; on mobile it stays closed by default, because it is not.

**Sound.** The draw is the only place the app makes a sound: a riffle for each of the two shuffles, a soft slide as the fan spreads, and a flip as the picked card turns — generated in the browser from filtered noise, not loaded from files, and timed to the keyframes in `Round.css` (retime `playShuffle` and `playFlip` in `src/lib/sounds.ts` if those move). Recording starts with Speaking, so none of it can reach a recording. A Card sounds switch in Settings turns it off, on by default; switched off, the app never creates an audio context at all. Reduced motion drops the riffle and slide, since there is no shuffle on screen to match, and keeps the flip as feedback for the tap. On an iPhone the ring/silent switch silences it, which is correct for decorative sound.

### 4.4 Speaking

The timer is the only large element. Everything else recedes.

Default display is time remaining, counting down. At the yellow threshold the page tint, bar and chip all change together. At zero the display switches to `+m:ss` counting up, the label changes from "Left to speak" to "Still going", and the header gains the actual spoken total. The round never ends on its own — only "Finish" ends it.

**Yellow threshold.** Use `max(15s, 20% of target)`: 15s at the 1-minute setting, 24s at 2 minutes, 36s at 3 minutes. This is a decision worth revisiting after the first week of use; it is the one number in the design most likely to need tuning.

Recording indicator: a clay dot and the word "Recording" when active, a struck-through mic icon and "Recording off" when not. The dot does not blink.

Desktop: same structure, timer at 208px, bar 720px wide, Finish centred with "Or press Space when you're done." beside it. Space and Enter both finish the round; bind them only while the Speaking screen is mounted.

### 4.5 Review

Order on the screen is deliberate and follows the tone rules: what happened, then what you thought, then anything the app has to say.

1. A warm headline ("Nice — that's the hard part done.") and the round label. Straight after a round, Ace hops beside the headline (§3).
2. Summary card: the topic, then three tiles — Spoken, Target, Over. Overtime is shown in the same neutral text colour as the other two. Never red, never an icon, never "exceeded".
3. Playback: play button, waveform, duration, and a "Delete recording" text button. Absent entirely when the round wasn't recorded.
4. Self-ratings: Structure, Clarity, Confidence, Filler words, each 1–5. No aggregate score is shown here; the average appears only in History.
5. Notes: a single textarea, labelled "One thing to try next time", placeholder "Slow down before the example."
6. Feedback card (ships at M2.5), in one of six states: idle (Get feedback), loading, offline, **thin**, ready, and ready without the written half.
   - **Thin**: the transcript has fewer than 20 words (`MIN_WORDS`, about ten seconds of talk). The card says "Not enough to go on" and asks for half a minute or more next time. No tiles, no chips, no "lowest so far" — zeros read as results, and a silent four-second round once earned praise for having no filler words. Thin rounds keep their transcript but store no numbers, and any round too thin to count is left out of the averages and the filler strip, including ones measured before this existed. The server skips the model call for them.
   - **The checklist, "What the coach noticed"** (inside ready, after What went well): five criteria the words can show — Made a clear point, Backed it with a reason, Gave an example, Landed it at the end (Point–Reason–Example–Point, as the prep hint teaches), and Answered the question — each marked There, Partly or Not yet with a short note. Marks, never numbers or an overall score (§8). Filled, half and open dots in `--accent`, so the mark reads without colour and nothing is red. Notes describe what happened; the one thing to change stays in Try next time, so corrective feedback is still singular. A footnote says confidence and delivery aren't marked, because the coach only reads words. The server sends the topic so "answered" can be judged, and keeps all five marks or none. Absent on rounds written before it existed.
   - **How it sounded** (inside ready, after the words worth swapping): plain-words rows, never scores. *Pace* — words a minute and whether it held steady across 15-second stretches. *Pauses* — gaps of a second or more, those of 1.5 s inside a sentence counted as mid-sentence, and the longest. *Hedging* — "I think", "maybe", "probably", "I guess", "perhaps", "I suppose", also shown as soft-sage chips. *Clarity* — how sure the transcriber was (Groq's per-segment `avg_logprob`, duration-weighted, mapped 0–100), worded as "Clear throughout" / "Mostly clear" / "Hard to make out in places", with a note that it isn't a pronunciation test. *Pitch*, *Volume*, *Endings* (trailing off) and *Rising endings* (upspeak) — measured on the phone in a Web Worker from the recording at 16 kHz, so the audio never leaves for them (`src/lib/voice.ts`, `voiceWorker.ts`). Groq is asked for word and segment timings (`verbose_json`) to make the rest possible. Every threshold is a first guess, to tune against real rounds. Rows appear only for what was measured, and the whole layer is fail-safe: if timings can't be read or the voice can't be analysed, the round keeps today's feedback.
   - **Ready without the written half**: the numbers show, then a block titled "The written part" says it didn't come back, with Try again when there's audio to resend. Never a silent gap where three sections should be. The function logs why (model status and error code, empty reply, missing fields, not JSON) — never the transcript or the reply.
7. Actions: "Next topic" primary, "Save and go home" secondary, and — for a round just finished — a "Retake this topic" text button. Retake replaces the round rather than adding one, so History keeps one round per attempt that counted and the trend isn't skewed by do-overs. It asks first, in a sheet that says what goes and what stays: "This round is deleted — its recording, your ratings, your note and any feedback. You go straight back to prep with the same topic and the same timings." Buttons: "Delete and retake" (destructive) and "Keep this round" (focused by default). It isn't offered on a past round opened from History, or if the round's topic no longer exists, since Round would silently pick another. The retake goes straight to prep, not the card draw — the topic is already chosen.

Ratings and notes save on change, not on submit, so leaving by any route keeps them.

**Feedback card states.** The card is on demand. Nothing runs until the user asks for it, so no round ever spends time or money it was not asked to.

- **Empty** (M2, before the feature exists): muted card, "Not on yet" badge, one sentence describing what will appear. This is the reserved height every later state fills.
- **Ready to run**: waveform icon, "Feedback on this round", one sentence naming what comes back, a primary "Get feedback" button, and the plain line about where the audio goes (§9).
- **Loading**: spinner, three skeleton lines, three skeleton tiles at the exact size of the real metric tiles, and the reassurance that ratings are already saved and the user can carry on.
- **Ready**: in order — "What went well"; the three metric tiles (words per minute, filler words, vague words), each carrying a delta against the user's own running average; the flagged words as chips, filler words in neutral grey and vague words in warm sand; filler counts across the last five rounds as five bars with the current round accented, and one plain sentence beneath them; the one sharper rewrite, quoting the user's own sentence above it; then a single "Try next time". One focus, never a list of faults. A link opens the full transcript.
- **Offline**: "No connection" with a "Waiting" badge, saying the round is saved in full and that turning it into text needs a connection, which will happen by itself the next time there is one.

**Where the numbers come from.** The transcript is the only thing the server returns; words per minute, the filler and vague counts and the chips are all computed in the browser from it, against the fixed word lists in the design brief. Whole words only — "like" must not match "likely" — and multi-word phrases like "kind of" count as one. A delta against your own average appears only once three earlier rounds have metrics.

**The two halves.** Everything counted — the three metrics, the deltas, the chips, the five-round bars — comes out of the transcript by plain string matching and needs no model at all. Only "What went well", the sharper rewrite and "Try next time" are written. At M2.5 the counted half ships on its own and those three blocks are simply absent: the same component with them unrendered, not a placeholder and not a teaser for a later version.

**Deltas** are computed at render time from the user's own recent rounds, not stored on the session. A round with fewer than three earlier rounds to compare against shows no delta rather than a misleading one.

**Delete recording** opens the bottom sheet: "Delete this recording?" / "This one is permanent — the audio is gone for good. Your ratings and notes stay put, so your history keeps the progress." / "Delete recording" / "Keep it". Deleting audio must leave the session record intact.

Desktop splits into two columns: summary, playback and the feedback card on the left; ratings, notes and actions on the right.

### 4.6 History

Trend card first: four weekly bars with counts, the current week accented, and one plain-language sentence about the direction of travel. No chart axes, no percentages.

Then the session list. Each row is a link to that round's Review and shows date and category, duration, the topic in Newsreader, and the average rating as a number plus a five-dot meter. Rows are `<a>` elements, not divs with click handlers.

At the bottom: "Start practicing" and a "Delete all recordings" text button, the latter shown only while some round still has audio. Each row carries a 44×44 overflow button (three dots, top right, labelled for the round it belongs to) — the canvas shows the sheet but not what opens it, and a row that is a link cannot also hold a button. The delete-a-round sheet offers three choices in this order: delete the whole round, delete only the recording, cancel. The middle option exists because the brief requires that users can drop audio and keep progress.

Empty state: Ace leaning on the stage line (§3), "Nothing here yet.", a sentence explaining what will appear, and the Start button.

---

### 4.7 Collection

Every topic is a card, and answering it collects it: a saved round of 10 seconds or more, the same rule as Prep's "You've answered this one before" (§4.3). There are 210 topics, 30 per category (10 easy, 12 medium, 8 hard), so the header reads "47 of 210", with a thin progress bar and one scrolling row of category filters.

Cards are laid out by category, easy to hard, in fixed positions like an album. A collected card shows its face: the topic in Newsreader, difficulty as pips (◆ / ◆◆ / ◆◆◆), how many times it's been answered and when. Hard cards carry a thin gold rule and Wildcards a dotted frame, the same print language as the card draw. An uncollected card shows its back, with category and pips visible but the topic hidden, so finding one is still a small surprise. Tapping a collected card opens a sheet listing your rounds on it, each linking to its Review.

Nothing is stored for the collection: it's read from saved rounds, so it follows the account between devices. The picker deals unanswered topics first — same difficulty and new, then same difficulty, then today's fallbacks — so the collection keeps growing. Ways in: a Collection row on Home (absent on the first run, with nothing in it yet), and a link in History's header.

Straight after a round that collects a new card, Review shows "New card for your collection · 48 of 210" under the headline. Like Ace's hop, it's only on arrival from a round, never when a past round is reopened from History.

## 5. Round state machine

```
idle → setup → draw → prep → speaking → overtime → review → (next topic → draw | save → idle)
```

- `draw`: untimed; waits for a card to be picked. Skipped entirely for a topic picked by hand. Picking schedules prep to begin when the card sequence ends.
- `prep`: `prepRemaining` counts down from the setting. Exits on timeout, on "Start now", or on "Draw another" (which returns to the draw with six cards and a new topic, then restarts prep with the same duration).
- `speaking`: `elapsed` counts up; `remaining = target − elapsed`. Crosses into the yellow band at the threshold above.
- `overtime`: entered when `elapsed ≥ target`. Display flips to `+elapsed − target`. Exits only on "Finish".
- Recording starts on entry to `speaking` and stops on exit from `speaking`/`overtime`, so prep is never recorded.
- Leaving the tab does not pause anything. On return, recompute from `performance.now()` rather than trusting accumulated ticks.

**Topic selection.** Filter by category and difficulty, exclude the last 20 topics served, then pick at random. A skip excludes the skipped topic for the rest of the session. "Surprise me" draws from all seven categories with equal weight per category, not per topic, so the small categories still appear.

---

## 6. Data model

```ts
type Session = {
  id: string;                 // uuid
  startedAt: string;          // ISO
  topicId: string;
  topicText: string;          // denormalised: topics may change or be AI-generated later
  category: Category;
  difficulty: 'easy' | 'medium' | 'hard';
  prepSeconds: 15 | 30 | 60;
  targetSeconds: 60 | 120 | 180;
  spokenSeconds: number;      // may exceed target
  recordingId?: string;       // absent once audio is deleted or was never made
  audioNote?: 'incomplete' | 'no-room' | 'interrupted'; // why audio is partial or missing; shown on Review
  ratings?: {
    structure?: 1|2|3|4|5;
    clarity?: 1|2|3|4|5;
    confidence?: 1|2|3|4|5;
    fillers?: 1|2|3|4|5;
  };
  note?: string;

  // Feedback. All optional: absent until the user asks for it, and absent
  // for good if they never do. Deleting the audio does not touch any of it.
  transcript?: string;
  metrics?: {
    wordsPerMinute: number;   // words / (spokenSeconds / 60)
    fillerWords: number;      // total occurrences, not distinct words
    vagueWords: number;
    flagged: { word: string; kind: 'filler' | 'vague'; count: number }[];
  };
  written?: {                 // the model-written half; absent at M2.5
    wentWell: string;
    quoted: string;           // the user's own sentence, verbatim
    sharper: string;
    tryNextTime: string;
  };

  // Sync (M5). Unused while signed out, and harmless to carry.
  updatedAt?: string;         // ISO; last local change. Last writer wins between devices
  deletedAt?: string;         // a tombstone: the round is gone, but other devices must hear so
  recordingPath?: string;     // where the audio sits in the account's private bucket
  syncedAt?: string;          // updatedAt at the moment this round last reached the server
};

type Settings = {
  category: Category | 'surprise';
  difficulty: 'easy' | 'medium' | 'hard';
  prepSeconds: 15 | 30 | 60;
  targetSeconds: 60 | 120 | 180;
  recordAudio: boolean;
  showStructureHint: boolean;
  theme: 'system' | 'light' | 'dark';
};
```

Audio blobs live in IndexedDB keyed by `recordingId`; sessions and settings live in localStorage. Deleting a recording removes the blob and clears `recordingId`, leaving the session. "Delete all data" clears both stores and returns to the first-run Home.

Leave room for a Phase 5 `userId` and a `syncedAt` on `Session`; nothing else in the shape should need to change when accounts arrive.

---

## 7. Accessibility

- Contrast: all body and caption text meets 4.5:1 against its own background; `--text-muted` is the floor and must not be lightened. Large text (24px and up) meets 3:1.
- Timing lights never rely on colour: shape plus label plus position carry the same information.
- Announce phase changes on a polite live region: "Prep started, 30 seconds", "Speaking started, 2 minutes", "Time's up, still recording", "Round finished". Announce the timer itself only at meaningful moments — not every second.
- Respect `prefers-reduced-motion` for the countdown ring, the tint cross-fade and the sheet transition.
- Every control is reachable and operable by keyboard; focus order follows visual order; the sheet traps focus and Escape cancels.
- The topic is an `<h1>`-level element on Prep so screen readers land on it first.
- Touch targets 44px minimum, including the rating pills.

---

## 8. Copy rules

These are behavioural, not decorative. A build that gets the pixels right and the words wrong misses the product.

- Lead with what went well. Anything corrective comes second and is singular — "Try next time", never a list.
- No grades, no red crosses, no "error", "failed", "exceeded", "too long".
- Overtime is neutral: "Past your target", "+0:20", "No rush. Land your last point, then finish."
- Unavailable things are stated plainly and kindly: "Not on yet", "Off while the mic is blocked."
- Destructive copy says exactly what is lost and what survives, in that order.
- Playfulness lives in empty states, the celebration line and the wildcard topics — not in error messaging, where it reads as evasive.
- Use "round" for one practice cycle, throughout. Not "session" in the interface, though `Session` is fine as a data type.

---

## 9. Web behaviour

This is a web app, not a native one wearing a browser costume. These behaviours have no mobile-app equivalent and are the most likely things for an implementation to get wrong by omission.

### Routes

| Path | Screen | Notes |
| --- | --- | --- |
| `/` | Home | |
| `/setup` | Session setup | |
| `/round` | Prep, then Speaking | One route for the live round, not two — see below |
| `/round/review` | Review of the round just finished | |
| `/history` | History | |
| `/history/:sessionId` | Review of a past round | Same component as `/round/review`, loaded from storage |
| `/collection` | Collection | Every topic as a card; collected by answering it (§4.7) |
| `/settings` | Settings | Theme, the Card sounds switch, the account section when signed in, a line saying what is stored, the two delete-everything actions, and a link to `/privacy` |
| `/privacy` | Your data | Where a recording goes, in plain words. Linked from Settings. Google sign-in cannot be published without a page here |
| `/signin` | Sign in | Email magic link. Optional: the app works signed out, and says so here |

Prep and Speaking share `/round` deliberately. They are one continuous act from the user's point of view, and giving Speaking its own URL invites a back-button press that lands on a prep screen for a round already under way.

### Back button

From `/round`, back **asks**: a bottom sheet, "Leave this round?" / "The topic and your time go. Nothing is saved." / "Leave" / "Keep going". Push a history entry on entering the round so the first back press is intercepted rather than exiting the app; if the user confirms, stop the recorder, discard the audio and return to `/`. From `/round/review`, back goes Home and keeps the round — it is already saved, so there is nothing to warn about. From `/history/:id`, back returns to `/history` with scroll position restored. Never trap the user: a second deliberate back press after the sheet is dismissed always works.

### Refresh mid-round

Persist `{ phase, topicId, startedAt, settings }` on entry to prep and to speaking, and write a heartbeat every five seconds while a round is live and on `visibilitychange` — not every frame. On load, if a round is in progress: under five seconds since the last heartbeat, resume silently at the recomputed time; over five seconds, do not resume the timer — show Review for what was captured if the round had reached speaking, otherwise return Home with one quiet line, "That round got interrupted." No modal, no apology.

A `MediaRecorder` does not survive a reload. Audio recorded before a refresh is gone, and no copy should promise otherwise.

### Tab blur while speaking

The timer keeps running. The user is talking to a room, not to the tab, and a phone that dims its screen mid-sentence must not pause. On return, recompute from `performance.now()` rather than replaying ticks. Recording continues too — browsers keep `MediaRecorder` alive in a backgrounded tab — but a phone browser may suspend it when the user switches apps entirely, so check `recorder.state` on `visibilitychange` and mark the round as having incomplete audio rather than silently producing a truncated file.

`beforeunload` prompts only while a round is live. Nowhere else — an unsolicited "are you sure you want to leave" on a review screen is what makes a web app feel cheap.

### Offline and install

Everything in Phase 1–2 runs offline once loaded; there is nothing to fetch. Ship a service worker precaching the shell, the two font files and the topic list, and a web app manifest with `display: standalone`, so the app can live on a home screen without browser chrome. Keep the top padding in standalone mode — the status bar is still there — though with no URL bar the header can sit a little higher.

Feedback changes this, and only feedback: turning the recording into text is a network call, so the card has an offline state saying the round is saved and that it will run by itself once a connection returns. Everything else — the round, the timer, playback, ratings, notes, History — still works with no connection at all.

### Where the audio goes

The recording leaves the device to be turned into text, through a small function of our own that holds the API key, and is not kept at the other end. Signed out, the copy the user keeps lives on their device and nowhere else. Signed in, it is also in their own account's private storage — the recording toggle says so in as many words, and deleting a recording removes it from both. Say this once, plainly, on the card's ready-to-run state — "Your recording leaves the device to be turned into text, and is not kept once that is done" — and again in Settings. Do not bury it in a policy page, and do not say "we value your privacy".

### Storage limits and failure

Audio is the only thing that grows; a two-minute Opus recording is roughly 1MB, so a year of daily practice lands under 400MB — within a typical quota, but not comfortably. Track cumulative size and, past 300MB, offer in History to delete recordings older than a month while keeping ratings and notes. If a write fails on quota, keep the round, drop the audio, and say so plainly: "There wasn't room to save the audio, so this round is saved without it."

Some browsers block IndexedDB in private windows. Detect that at startup and run in a session-only mode with a quiet line on Home, rather than failing on the first save.

---

## 10. Not in this pass

Accounts and login, social and sharing, leaderboards, pricing. Navigation is built so a profile and settings area can be added to the Home header and an onboarding flow can precede first-run Home without moving anything else.

The feedback card must hold a transcript link, three metrics, five bars and short written feedback without crowding — the reserved-height empty card is what keeps that promise while only half of it exists. Phase 4 needs Home to accept cards below the Start button and History to accept streaks beside the trend card.

---

## 11. Open questions for the next pass

1. The yellow threshold formula (§4.4) is a first guess and should be tuned against real rounds.
2. "Start wrapping up" is a nudge; a neutral reading of the remaining time is the alternative. Worth testing which one helps and which one rattles.
3. Whether difficulty belongs in the Prep chip at all, or whether it is chrome that should disappear once the round begins.
4. Whether the ring belongs above the topic (calmer) or below it (topic read first).
5. Whether leaving a live round should really discard it, or whether an abandoned round is worth keeping in History as a partial.
6. Whether the filler-word tile can be trusted. Whisper is trained to tidy disfluencies away, so the count runs low on some rounds. Judge it against twenty real rounds before deciding whether to keep the tile, seed the decoder prompt differently, or move to a speech API built for disfluencies.
7. Whether the five-round bars belong on Review at all, or whether they say the same thing as History's trend card one screen earlier.
8. ~~**Whether choosing a category is findable enough.**~~ *Answered in session three.* Home now states the round the big button will play — "Surprise me · Medium · 30s, 2 min" — with a Change link beside it to Setup, and the "Set the round" text button is gone. Two consequences worth knowing: the line is `aria-describedby` on Start, so a screen reader hears the round before the button's label takes effect; and "Same as last time" now hides when the last round matches the current defaults, because the two lines otherwise said the same thing twice. Still open underneath it: Setup saves only when a round is started from it, so opening Setup, changing a pill and pressing back discards the change — the line will keep reading the old round, which is honest but may read as a bug.
