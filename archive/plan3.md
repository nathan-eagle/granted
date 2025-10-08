# PLAN3.md — Interactive FTUE + Live Autopilot + Generic RFP “Auto‑Pack”

Progress checklist
- [x] M1 — FTUE Stepper (Program/RFP → 6 Qs → Upload) + “Run Autopilot”
- [x] M2 — Streaming Autopilot (SSE) + Magic Overlay with live section events
- [x] M3 — Magic Canvas basics (workspace updates + Top Fixes surfacing)
- [x] M4 — Facts wired and used in draft (markers + source list)
- [x] M5 — Coverage auto‑recompute in flow + Tighten Guard (revert if worse)
- [x] M6 — Top Fixes + Apply All Safe Fixes
- [x] M7 — Elegant DOCX + Mini Demo Mode

## Why this plan

- **Make the magic visible.** Users should **see** the draft writing itself, section by section, with progress, deltas, and fixes coming in live—**not** stare at a spinner.
- **Meet everyone where they are.** Keep **NSF/NIH SBIR packs** for specialists, **and** add a **generic auto‑pack** so any grant writer can paste an RFP URL or upload a PDF and get a faithful outline + rubric instantly.
- **Minimal churn.** Reuse the current APIs and pages; add a **streaming Autopilot** layer and a **stepper FTUE** that feeds the orchestrator.

---

## Design tenets

1. **Show work early:** stream **real section text** as it’s generated; don’t wait for the whole JSON to finish.
2. **One click, many steps:** orchestrate *facts → draft → coverage → fill gaps → tighten → review → safe fixes* behind a single **Run Autopilot**.
3. **Generic by default, specialized on demand:** if the user provides an RFP (URL/PDF), synthesize an **auto‑pack**; if they pick *NSF/NIH SBIR*, use the curated pack.
4. **Safety by default:** tightening never lowers coverage; if it would, revert automatically.
5. **Calm, premium UI:** dark, minimal, clear hierarchy, tiny animations, and a **Magic Overlay** that narrates what the AI is doing.

---

## What we’ll ship in this plan

- **New /new stepper** (3 steps) that starts collecting info immediately.
- **Streaming Autopilot** (SSE): see sections appear live + live status timeline.
- **Generic “auto‑pack” from any RFP** (URL or uploaded PDF).
- **Facts → used in draft:** top facts are consumed by Autopilot and visible as small source bubbles; drag‑to‑insert facts later.
- **Coverage auto‑recompute + tighten guard** (revert if coverage drops).
- **Top Fixes** panel surfaced immediately after the run.
- **Elegant DOCX** (title page; clean headings; budget table).
- **Keep “Advanced” manual actions** tucked away; the FTUE path is the streaming Autopilot.

---

## Event‑driven streaming (the backbone)

We’ll stream real progress via **Server‑Sent Events (SSE)**. The Autopilot orchestrator will emit small JSON events; the client subscribes and updates both the **Magic Overlay** and a **Live Draft Pane**.

**SSE endpoint**: `GET /api/autopilot/stream?projectId=...`  
**Event format**: NDJSON, one JSON object per line with a `type` and `data`.

```jsonc
// Examples:
{ "type": "status", "data": { "step": "drafting", "label": "Drafting sections…" } }
{ "type": "section_start", "data": { "key": "technical", "title": "Technical Volume" } }
{ "type": "section_delta", "data": { "key": "technical", "delta": "In Phase I we will…" } }
{ "type": "section_complete", "data": { "key": "technical", "words": 1280 } }
{ "type": "coverage_update", "data": { "key": "technical", "completionPct": 0.6, "missing": ["Risks"] } }
{ "type": "gap_fixed", "data": { "key": "commercial", "label": "Market Size" } }
{ "type": "tighten_ok", "data": { "key": "technical", "toWords": 4950 } }
{ "type": "tighten_reverted", "data": { "key": "team" } }
{ "type": "fix_list", "data": { "items": [/* top fixes */] } }
{ "type": "done", "data": {} }
{ "type": "error", "data": { "message": "…" } }
```

> Why SSE (not websockets)? Simpler to deploy on Vercel with Next.js route handlers; perfect for one‑way progress + deltas.

---

## Milestones (small, shippable chunks)

Each milestone ends with working software the user can click through.

### M1 — FTUE Stepper (Program/RFP → 6 Qs → Upload) + “Run Autopilot” ✅

**Objective:** Replace the old `/new` with an **interactive 3‑step wizard**; on final step, launch the streaming Autopilot.

- **Step 1 — Program or RFP**
  - Option A: choose a curated pack (NSF SBIR Phase I default; NIH also visible).
  - Option B: **“I have an RFP”** → field for URL **or** file drop (PDF).
  - If URL/PDF present: hit `POST /api/autopilot/generate-pack` (see M2) to **create an auto‑pack** and stash on the project.
- **Step 2 — Six quick questions** (skippable, inline examples).  
  “Skip & let AI guess” keeps the flow moving.
- **Step 3 — Add materials (optional)**  
  Drag‑and‑drop `.pdf/.docx/.txt/.md` (multi‑file). Show a live “N docs • X chars parsed” indicator.
- **Primary CTA:** **Run Autopilot** → open **Magic Overlay** and connect to `/api/autopilot/stream`.

**Implementation tips**
- Route handler for uploads must run with **`export const runtime = 'nodejs'`** and **`dynamic = 'force-dynamic'`** (PDF/DOCX parse libs).
- Keep the old “manual” buttons out of the FTUE; surface them **later** in an “Advanced” drawer.

**Acceptance**
- User can go Program→Questions→Upload and click **Run Autopilot**; overlay opens and begins streaming (next milestone).

---

### M2 — Streaming Autopilot (SSE) + Magic Overlay ✅

**Objective:** Orchestrate all steps behind one button **and** stream concrete progress + live section text.

**Server**
- **New route:** `GET /api/autopilot/stream` (SSE)
  - Emits the event types listed above.
  - Internally calls the orchestrator (reuse existing endpoints as functions).
- **Orchestrator steps** (emit `status` before each):
  1. **facts** (if uploads) → emit `status: parsing docs`, then `status: facts mined`.
  2. **autodraft (per section, streaming)**  
     - For each section spec:
       - Emit `section_start`.
       - Call LLM in **streaming** mode for **Markdown prose only**; for each token chunk, emit `section_delta` (don’t save to DB yet).
       - After completion, compute `slotsStatus` (quick heuristic or tiny LLM call).
       - Save the full section to DB; emit `section_complete`.  
     - **Rationale:** Users see real text appear immediately; we avoid DB writes for every token.
  3. **coverage** → emit `coverage_update` per section.
  4. **fill gaps (≤2 per section)** → after each, emit `gap_fixed` and `coverage_update`.
  5. **tighten to limit** → run coverage; if it drops, **revert** and emit `tighten_reverted`; else emit `tighten_ok`.
  6. **mock review** → emit `fix_list`.
  7. **apply safe fixes** (append‑only patches, no dupes, no over‑limit) → emit `status`.
  8. **final coverage** → emit `done`.

**Client**
- **Magic Overlay** subscribes to SSE. It shows:
  - A vertical **step timeline** with animated checkmarks.
  - A **Live Draft Pane** that switches focus to the current section and **streams text** as it arrives (`section_delta`).
  - A tiny **TOC** highlighting the section being written.
  - Errors surface in‑overlay with retry.

**Acceptance**
- Clicking **Run Autopilot** immediately shows actual prose streaming in for the first section, then the next, etc. No dead spinner. When “done” fires, the overlay closes, and the draft page shows **Top Fixes**.

---

### M3 — Generic “Auto‑Pack” from any RFP (URL/PDF)

**Objective:** Support all grants by synthesizing an `AgencyPack` from the RFP.

- **New route:** `POST /api/autopilot/generate-pack`
  - **Input:** `{ projectId, rfpUrl? , rfpUploadId? }`
  - Fetch/parse text (use same PDF parser as uploads).
  - **LLM prompt (JSON mode):** extract **sections** (title + suggested word limits + mustCover), **rubric** (criteria + weights), **attachments**.
  - **Output:** a valid `AgencyPack` JSON; store in `Project.meta.autoPack`; set `Project.agencyPackId = 'auto'`.
- **Loader:** update your pack loader to return `meta.autoPack` when present; otherwise use curated packs.

**Acceptance**
- Pasting an RFP URL or uploading a PDF produces a reasonable outline and rubric; Autopilot uses it.

---

### M4 — Facts that feel premium (and get used) ✅

**Objective:** Facts improve trust and drafts. Make them **visible and helpful**.

- **Upload**: accept `.pdf/.docx/.txt/.md` (already wired in M1).
- **Fact miner**: keep the current approach; ensure each fact has `{id, kind, text, evidence: {uploadId, quote}}`.
- **Autodraft**: pass **top N facts** and **charter** to each section writer; require it to **embed markers** like `{{fact:ID}}` whenever a fact is used.
- **UI**: Right rail **Facts** → small cards grouped by kind; **drag‑to‑insert**; on hover, show filename + evidence snippet. Inserted facts show a tiny **(Source: filename)** bubble inline.

**Acceptance**
- Live draft shows “(Source: …)” bubbles where facts are used; users can drag additional facts in later.

---

### M5 — Coverage auto‑recompute + Tighten Guard ✅

**Objective:** Improve trust—length tools won’t nuke required content.

- After **any mutation** (`fill gap`, `tighten`, fixes applied), call the coverage function and **persist** updated coverage.
- **Tighten guard**: if coverage (`completionPct`) drops post‑tighten, automatically **revert** (keep the prior `contentMd`) and emit `tighten_reverted`.

**Acceptance**
- Coverage bars are always current. Tighten never reduces coverage; reverts when needed.

---

### M6 — Top Fixes surfaced first + “Apply All Safe Fixes” ✅

**Objective:** Users see immediately **what to fix** (and can apply safely).

- On overlay close, show a **Top Fixes** panel (3–5 items) at the top of the draft.
- Each item: **Apply** (append patch) + **Open section**.
- Add **Apply All Safe Fixes** (skip duplicates; respect limits).

**Acceptance**
- Fixes are sorted by expected impact; applying does not introduce duplicates or over‑limit sections.

---

### M7 — Elegant DOCX (+ mini demo mode) ✅

**Objective:** End with a **presentable** export; make demos effortless.

- **DOCX**: title page (gradient band, project title, company, date); section headings; budget table with total bolded; use a robust markdown‑to‑text step to avoid stray symbols.
- **Demo mode**: “Try sample” on the landing page fills the wizard with sample answers + a sample doc, then runs Autopilot automatically.

**Acceptance**
- Word/Pages open the doc cleanly; demo flow runs end‑to‑end and looks great.

---

## Implementation details

### 1) Autodraft (per‑section writer, streaming)
- Replace the single “return all sections JSON” approach **inside the streaming path** with a **loop over sections**:
  - **Prompt** (system): “Write the `<Section Title>` for this grant. Use CHARTER + FACTS; when using a fact, embed `{{fact:ID}}`. Write Markdown only. Keep to ~limit words.”
  - **Stream tokens** from the LLM and forward as `section_delta`.
  - After stream ends:
    - Run a quick **slot check** (heuristic or a tiny LLM call returning `{slotsStatus[]}`).
    - Save the full text + slots to DB.
- This gives visible progress **and** reliable persistence.

### 2) Gap fill
- `fill_gap(section, gapLabel, charter, facts)` → return a **2–5 sentence patch** that satisfies the slot; append, recompute coverage, emit `gap_fixed`.

### 3) Duplicate‑patch guard
- Before applying a patch, check if `contentMd.includes(patch.slice(0, 60))`; if yes, skip.

### 4) Upload parsing
- PDF: `pdf-parse` or `pdfjs-dist` server‑side (Node runtime).
- DOCX: `mammoth` (server‑side).
- Save parsed text to `Upload.text` (cap at ~30k chars per file for speed).

### 5) SSE route handler (Next.js)
- `export const runtime = 'nodejs'`
- Set headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`.
- Flush lines ending with `\n` per JSON event. Keep events **small** and frequent.

### 6) Client overlay
- Use **EventSource** (browser SSE) to subscribe.
- Maintain:
  - `liveText[sectionKey]` buffers (strings).
  - A current `step` for the timeline.
  - A `toc` with completion state.
- On `done`, close the overlay and navigate/focus to **Top Fixes**.

### 7) Metrics
- `t1`: when Autopilot starts; `t2`: when all required sections saved. Store in `Project.meta`.
- Log step durations (drafting, gaps, tighten, review) for perf tuning.

---

## Minimal prompts (ready to paste into `/web/lib/prompts`)

**`writeSection.system`**
```
You write SBIR/STTR-style grant sections for non-technical founders.
Write ONLY Markdown prose for the section "{{SECTION_TITLE}}".
Use CHARTER and FACTS. When using a fact, embed {{fact:ID}} inline.
Stay within ~{{LIMIT_WORDS}} words (±10%). Clear, reviewer-friendly voice.
```

**`slotsCheck.system`**
```
Given SECTION and MUST_COVER labels for this agency pack, mark each slot as "ok" or "missing".
Return ONLY JSON: { "slotsStatus": [{"label": string, "status": "ok"|"missing"}] }.
```

**`fillGap.system`**
```
Patch ONE missing slot with 2–5 concise sentences using CHARTER and FACTS only.
Do not repeat existing content. If using a fact, embed {{fact:ID}}.
Return ONLY JSON: { "patchMd": string, "usedFactIds": string[] }.
```

**`generatePack.system`**
```
From this RFP text, synthesize an agency pack.
Return ONLY JSON: {
  "id": "auto_<hash>",
  "name": string,
  "sections": [{"id":string,"title":string,"limitWords":number,"mustCover":string[]}...],
  "rubric": [{"id":string,"name":string,"weight":number}...],
  "attachments": [{"name":string,"required":boolean}...]
}
Prefer clear, generic section names if not specified by the RFP.
```

---

## QA script (manual)

1. **Generic flow:** Paste an RFP URL → Skip questions → Upload a PDF → **Run Autopilot**.  
   - Overlay shows **section text streaming live**; you can read while it writes.  
   - When done, **Top Fixes** visible; **Apply All Safe Fixes** works and doesn’t duplicate.  
   - Export DOCX → open in Word; title page + budget table look clean.
2. **Pack flow:** Choose **NSF SBIR** (no RFP). Skip everything. **Run Autopilot**.  
   - Outline matches the pack; coverage bars present; tighten guard reverts when needed.
3. **Facts UX:** Upload a company one‑pager → facts mined; drag a fact into Commercialization; source bubble appears.  
   - Re‑run Autopilot; generated text shows `{{fact:ID}}` (hidden in render, present in source).

---

## De‑risking notes

- **Streaming without heavy infra:** SSE from a single route is enough for ≤10 concurrent users.
- **DB write load:** Save full sections at `section_complete`, not on every token; deltas live in the overlay state only.
- **Edge vs Node:** Keep parsing and SSE on **Node runtime** handlers.
- **Fallback:** If streaming fails mid‑run, persist whatever is complete and let the user continue manually (show an in‑UI toast with “Continue from here” buttons).

---

## What to keep from the old flow

- The **manual** buttons (coverage, fix next, tighten, mock review) are still useful—just **tuck them into an “Advanced” drawer** on the draft page. The FTUE path is the streaming Autopilot.

---

## Success criteria

- A new user can land, paste an RFP or pick a pack, press **Run Autopilot**, and **watch** a credible first draft materialize across sections in less time than it takes to read a page, with immediate **Top Fixes** to act on.
- Specialized users (NSF/NIH SBIR) get familiar structure and language; everyone else benefits from the auto‑pack.

---

**End of PLAN3.md**
