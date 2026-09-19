# Design source — read this before using these files

These 27 files are the artboards from the Stand Up design canvas, one per screen state. They are the **visual source of truth**: exact colours, sizes, spacing, copy and markup structure. `../stand-up-handoff.md` is the **behavioural source of truth**: what the numbers mean, what happens on interaction, how state moves.

## What these files are

Each `.dc.html` is a static comp written as real HTML: real `<button>`, `<a href>`, `<input type="radio">` inside `<label>`, `<fieldset>`/`<legend>` for grouped controls, and inline styles carrying every design value. Read them the way you would read a component's stylesheet — copy the exact values out of them rather than eyeballing a screenshot.

## What these files are NOT

- **Not a prototype in the working sense.** There is no timer, no state, no routing, no storage, no audio. Every clock value is frozen at a chosen moment: `1:23` on the on-track Speaking frame, `+0:20` on overtime, `22` on the prep ring. The ring's `stroke-dashoffset` is a hardcoded number for that one moment, not a computed value.
- **Not runnable as-is.** Each file's `<head>` loads `./support.js`, which belongs to the design-canvas runtime and is not in this repo. Opening one in a browser will not render it correctly. Do not try to fix this, and do not add a `support.js` — the files are here to be read, not served.
- **Not components.** There is one file per *state*, not per component, so the same card markup repeats across several files. Deduplicate into real components as you build; don't mirror this file structure in the app.
- **Not a full set of interaction states.** Hover, focus, active, disabled and error styling are specified in the handoff document, not drawn here. Where a frame shows a selected item (a rating pill, a difficulty option), that is the selected style; the unselected style is on the same frame beside it.

## Mapping frames to screens

| Screen | Frames |
| --- | --- |
| Home | `Home`, `HomeFirstRun`, `HomeDesktop` |
| Session setup | `SessionSetup`, `SessionSetupMicBlocked`, `SessionSetupDesktop` |
| Prep | `Main` (default), `PrepStructureHint`, `PrepLongTopic`, `PrepDark`, `PrepReducedMotion`, `PrepDesktop` |
| Speaking | `SpeakingOnTrack`, `SpeakingWrapUp`, `SpeakingOvertime`, `SpeakingDark`, `SpeakingDesktop` |
| Review | `Review`, `ReviewAiLoading`, `ReviewAiReady`, `ReviewDeleteRecording`, `ReviewDark`, `ReviewDesktop` |
| History | `History`, `HistoryEmpty`, `HistoryDeleteSession`, `HistoryDesktop` |

`Main.dc.html` is the Prep default state — the name is a convention of the canvas format, not a hint about app structure.

`canvas.json` is the canvas index: frame positions, sizes and titles. Useful only for knowing which frame is which; it has no bearing on the app.

## Phase 1 build order

Only these frames matter for the first milestone: `Home`, `HomeFirstRun`, `HomeDesktop`, `SessionSetup`, `SessionSetupDesktop`, the six Prep frames, and the five Speaking frames. Review and History frames are Phase 2 — read them for consistency of card and list patterns, but don't build them yet.
