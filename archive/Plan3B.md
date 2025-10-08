# Plan3B — Finish Streaming FTUE + Trust UI

Purpose: converge from “works” to “feels great” with a short, shippable sequence that finishes the visible gaps from PLAN3 and tightens trust/observability. Each item is small enough to ship independently and can be rolled out in order.

## Prioritized Sequence (P0–P2)

P0 — Must‑have polish (ship this week)
1) Live Draft Pane: render live section text while Autopilot runs
   - Client subscribes to `section_start`/`section_delta`/`section_complete` and writes to an in‑memory draft map.
   - “Watching” view beside overlay; when run completes, content persists (already saved on server at complete).
   - Acceptance: users can read sections as they are written.

2) Coverage Bars + Word Counts
   - Show per‑section completion % + word count beside headings.
   - Recompute after each step (already done server‑side) and update UI.
   - Acceptance: visible bars update after drafting/gaps/tighten.

3) Progress Log Panel (Last Run)
   - Compact panel on the draft page with timestamped steps + durations (+ docs parsed).
   - Pulls from `Project.meta.progress` and events emitted during stream.
   - Acceptance: user can confirm it’s not stuck; sees what ran.

P1 — Trust, clarity, and control (next)
4) Advanced Drawer (consolidate manual tools)
   - Move “Recompute coverage / Fix next / Tighten / Mock review / Apply fixes” into an Advanced drawer.
   - Keep the FTUE path clean with a single “Run Autopilot”.

5) Facts Drag‑Insert + Inline Source Bubbles
   - Enable drag‑to‑insert facts; mark insertion in Markdown and render tiny inline source bubbles.
   - Keep current “Append” as fallback.

6) “Try Sample” on Landing
   - Prominent CTA on the home/landing page linking to `/demo` (auto‑run sample).

P2 — Nice‑to‑have depth
7) DOCX Cosmetics
   - Title page gradient band + nicer typography; section spacing; headings and table polish.

8) Chunked Facts Mining (long PDFs)
   - Split >30k char documents into chunks; mine facts per chunk; dedupe; link evidence.

## Supporting Tasks
- Timeout + retry annotations per step in the overlay (e.g., “Taking longer than usual… Retrying 1/2”).
- Progress heartbeat during long LLM calls (lightweight `progress` events every ~5s).
- Metrics: store `t1` (start) and `t2` (first full draft saved), and per‑step durations; surface in progress panel.

## Out of Scope (later)
- Rich editor (TipTap), multi‑user collaboration, audit trail per change.

## Notes
- We already: stream SSE, generate an auto‑pack from RFP, show docs parsed, list Documents in sidebar, tighten guard, Top Fixes flow, and DOCX export.
- We removed the legacy Projects UI; /projects links go straight to the Draft workspace.

