# Phase 1 build brief — Stand Up

Paste the section below into Claude Code with this folder open. Everything it needs is already here.

---

## The prompt

Read these three files before writing any code:

- `stand-up-handoff.md` — tokens, components, screen specs, state machine, routes, web behaviour, copy rules. This is the source of truth for behaviour.
- `design/README.md` — what the artboard files are and, importantly, what they are not.
- `stand-up-design-brief.md` — product context and the topic table you'll seed from.

Then build **Phase 1 only**: Home, Session setup, Topic reveal + Prep, and Speaking. No recording, no Review, no History — those are Phase 2 and the stubs for them should not exist yet beyond the routes returning a placeholder.

### Stack

Vite + React + TypeScript, React Router for the routes in §9 of the handoff, and plain CSS with custom properties — no component library, no CSS-in-JS, no Tailwind. The design is small and specific enough that a UI library would fight it. If you have a strong reason to deviate, say so before starting rather than after.

### Structure

```
src/
  main.tsx
  App.tsx                 routes only
  styles/tokens.css       every value from handoff §2, light + dark, as custom properties
  styles/base.css         resets, focus ring, font loading
  routes/Home.tsx
  routes/Setup.tsx
  routes/Round.tsx        prep and speaking share this route
  components/             Button, SegmentedControl, CountdownRing, ProgressBar, TimingChip, Card, Sheet
  lib/useRoundTimer.ts    the rAF loop
  lib/topics.ts           seed data + selection
  lib/settings.ts         localStorage read/write
  lib/format.ts           mm:ss and +mm:ss
```

One component per component, not one per screen state — the artboards repeat markup because they are separate frames, and the app should not.

### What to get exactly right

1. **Tokens first.** Transcribe handoff §2 into `tokens.css` before building any screen, including the dark set. Copy hex values verbatim from the artboards; do not round or substitute. Note the primary button inverts between themes — dark sage fill with light text in light mode, light sage fill with dark text in dark mode. It is not a straight palette swap.

2. **The timer.** One `requestAnimationFrame` loop driven by `performance.now()` deltas. Not `setInterval`. It keeps running when the tab is hidden and recomputes from the clock on return. Persist a heartbeat every five seconds and on `visibilitychange`.

3. **Timing lights carry three signals.** Page tint, progress-bar colour, and a chip whose shape changes with state — circle, triangle, square. Colour alone is never the signal. Yellow threshold is `max(15s, 20% of target)`.

4. **Overtime is neutral.** The round never ends on its own. At zero the display flips to `+m:ss` counting up and the label changes; nothing turns alarming.

5. **Real elements.** `<button>`, `<a href>`, `<input type="radio">` inside `<label>`, `<fieldset>` with `<legend>` for every group. Never a div with an onClick. Lift this structure straight from the artboards — it is already correct there.

6. **Copy verbatim.** Take every string from the artboards or the handoff, including "Skip used — this one's yours" and "Speaking starts on its own when prep runs out." Do not paraphrase or "improve" microcopy; §8 of the handoff explains why the wording is what it is.

7. **Back button and refresh.** Handoff §9. Leaving a live round asks first; refresh mid-round resumes only if under five seconds have passed.

### Topics

Seed `lib/topics.ts` from the table in `stand-up-design-brief.md` — all 35 topics, with category and difficulty. Selection: filter by category and difficulty, exclude the last 20 served, pick at random. "Surprise me" weights by category, not by topic, so small categories still appear.

### Out of scope

Recording, playback, ratings, notes, the feedback card, History, trends, accounts, settings beyond theme. Do not scaffold them.

### Done when

- `npm run dev` gives a working loop: Home → Start → Prep counts down → Speaking counts down → yellow at the threshold → overtime counts up → Finish returns Home.
- It works at 390px, at the 900–1180 tablet band, and at 1440.
- Light and dark both match their artboards.
- Keyboard alone can complete a full round, and focus is visible at every step.
- `prefers-reduced-motion` swaps the prep ring for the segmented bar.
- No console errors, no TypeScript errors.

Start by reading the three files and telling me your plan and any disagreements. Don't write code until I've responded.
