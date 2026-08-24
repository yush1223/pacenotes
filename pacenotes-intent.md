# Pacenotes — project intent

## What this is

A cross-game speedrunning companion: route notes + a split timer + PB/gold-split
tracking, in one browser-based tool. You pick a game, write a route as a sequence
of segments (each with free-text steps), then run it with a live timer that splits
per segment and compares you against your own history in real time.

## The gap this fills

Existing tools split cleanly into two camps, and nothing sits in the middle:

- **Split timers** (LiveSplit, LiveSplit One, Mist, Urn) — excellent at timing,
  but they carry no route content. You still need a second document open to
  remember what to actually do.
- **Route notes** (SplitGuides, Splitendo Power, wiki pages, Steam guides) —
  static text/PDF pages, usually bolted onto LiveSplit as a companion plugin.
  No timing logic of their own.

The one tool that combines both (ConvergenceToolbox's route editor) is hardcoded
to a single game via a modded client. Nothing is browser-based, cross-game, and
structured (route as data, not prose) with a real timer built in.

Pacenotes is that middle: one link, any game, structured route + live splits,
no install.

## Product pillars (in priority order)

1. **Cross-game by design.** The data model is game-agnostic from the start —
   games → routes → segments. Nothing should assume anything about a specific
   title. The How to Fish route in the seed data is a demo, not a special case.
2. **The route is data, not a text blob.** Segments are structured objects
   (title + notes), which is what makes gold splits, PB comparison, and the
   delta graph possible. Resist the urge to collapse this back into a single
   textarea — that's what every existing tool already does.
3. **Real speedrunning mechanics, not a generic checklist.**
   - **PB** — best full-run total, with the exact splits that produced it.
   - **Gold splits** — best-ever time for each individual segment, tracked
     independently of which run produced it.
   - **Best Possible Time (BPT)** — sum of golds. The theoretical ceiling.
   - **Live delta** — while running, compare current pace to PB at each split,
     not just at the end.
   These are the actual concepts serious runners track. A tool that only shows
   a single "total time" is a stopwatch, not a speedrunning tool.
4. **Visual identity earned from the subject, not skinned onto a template.**
   Two real mechanisms anchor the UI:
   - **Split-flap clock** — mechanical timing-tower digits for the run clock,
     not a glowing digital readout.
   - **Pace-note roller** — the current segment is shown as a physical scroll
     of segment titles winding past a fixed read-line, mirroring the actual
     device rally co-drivers use to read calls at speed.
   Lists are ledgers (hairline rows, monospace index, instrument-style stat
   readouts), not cards with colored accent bars. Brass/gold color is reserved
   for actual records — it is not the app's brand color. There is no single
   "neon accent on black" driving the palette; that reads as generic AI output
   and was deliberately designed out.

## Explicit non-goals (for now)

- No community/shared routes yet. Storage is per-user. Multi-user sharing is a
  real feature to consider later, but adds auth/backend complexity that isn't
  worth solving before the core loop is solid.
- No auto-splitting via game memory reading. Splits are manual (tap to advance),
  which is what makes this work for literally any game with zero setup.
- No mobile app / native build. Browser-first, responsive down to a phone
  viewport, that's the whole install story.

## What needs to change to leave the artifacts sandbox

The current file (`pacenotes.jsx`) was built inside Claude's artifacts
environment and uses `window.storage`, a sandbox-only persistence API. That
needs to be replaced before this runs anywhere else:

- Fast path: swap `getKey`/`setKey`/`deleteKey` for `localStorage` — keeps
  everything local-only but gets it running as a real app immediately.
- Real path: a small backend (even just a serverless KV store) keyed by a
  user id, which is also the prerequisite for the "shared routes" feature
  above if that's ever wanted.

The file is currently a single ~900-line component. Worth splitting into at
least: `storage.js` (persistence layer, the thing that changes), `time.js`
(formatting helpers), and one file per screen (`Library`, `GameDetail`,
`RouteEditor`, `RouteDetail`, `RunScreen`, `HistoryScreen`), plus the two
signature components (`FlapClock`, `PaceRoller`) since those are the pieces
most likely to get reused or refined.

## Where it's genuinely unfinished

- No editing of individual past runs (delete a bad run, for instance).
- No way to duplicate/fork a route (useful once someone wants to try an
  alternate strat without losing the original).
- No export/import of a route as JSON — worth having even before real
  multi-user sharing exists, just so a route isn't trapped in one browser's
  storage.
- Target time is manually typed in; could eventually pull a game's current
  WR from speedrun.com's API as a suggested default.
