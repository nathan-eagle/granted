
# Plan4.md — Grantable‑grade UI Parity + **Smart Citations** + Live Autopilot + Generic RFP “Auto‑Pack”
**Status:** Implementation checklist (extends Plan3/Plan3B).  
**Goal:** Ship a **beautiful**, Grantable‑style app that delivers an **Autopilot‑first**, **streaming** first draft; supports *any* RFP via a **generic auto‑pack**; and adds **drag‑and‑drop uploads with auto‑classification** and **trust‑building citations** (inline [1], hovercards, Citations panel, export as footnotes).

> Reference & continuity:
> - This plan **builds on Plan3B** (Live Draft Pane, Coverage Bars, Progress Log, Advanced drawer, Facts drag‑insert, Try Sample, DOCX polish). Keep that sequence, but **upgrade** trust/UI with **citations & evidence** and **wire streaming end‑to‑end**. fileciteturn0file0
>
> Screenshots to match visually:
>
> ![Grantable Editor](sandbox:/mnt/data/grantable3.png)
>
> ![Grantable Home + Tasks Drawer (A)](sandbox:/mnt/data/grantable1.png)
>
> ![Grantable Tasks Drawer (B)](sandbox:/mnt/data/grantable2 (ftue task list).png)

---

## Core Design Tenets (don’t violate)
1) **Show real work fast.** Stream *actual section prose* in seconds; no dead spinners.  
2) **Autopilot‑first.** One big CTA (**Run Autopilot**). Manual tools live in an **Advanced** drawer.  
3) **Generic by default, specialized on demand.** Auto‑pack from RFP if present; curated SBIR packs when chosen.  
4) **Trust UI.** Citations render as **[1]** superscripts with hovercards & a Citations panel; Tighten never reduces coverage (auto‑revert).  
5) **Calm, premium visuals.** Dark theme, soft radius (14px), gradient primary button (violet→cyan), subtle motion, skeletons.  
6) **Reliability.** SSE reconnection, optimistic UI with rollback, bounded loops & basic rate limiting.

---

# P0 — Biggest Wins (ship this week)

Progress checklist
- [x] P0.1 Streaming Overlay + Live Draft Pane (end‑to‑end)
- [x] P0.2 Uploads accept .pdf/.docx/.txt/.md + auto‑classification; basic Documents panel; overlay lists parsed filenames
- [x] Coverage bars + word counts per section
- [x] Progress log panel (last run)
- [ ] SSE reconnection with resume
- [ ] Assistant right panel + Advanced drawer polish
- [ ] Citations UI ([n] superscripts + panel; export later)

### P0.1 FTUE Stepper + **Streaming** MagicOverlay (end‑to‑end wire‑up)
**Files:** `web/app/new/page.tsx`, `web/components/MagicOverlay.tsx`, `web/app/api/autopilot/stream/route.ts`, `web/lib/pack/loader.ts`  
**What & Why:** Replace `/new` with a **3‑step wizard** and run **Autopilot streaming** with a **Magic Overlay** (timeline + Live Draft Pane). Users watch the draft materialize (Grantable vibe) while we do more (coverage, gaps, tighten, review) in the background.

**Stepper**
1. **Program or RFP** (cards: NSF SBIR (default), NIH SBIR; or “I have an RFP” URL/PDF). If RFP provided → `POST /api/autopilot/generate-pack` → store in `Project.meta.autoPack` and set `agencyPackId='auto'`.
2. **Six quick questions** (skippable; examples shown).  
3. **Add materials** (drag‑drop `.pdf/.docx/.txt/.md`; multi‑file).

**Overlay UX**
- **Left**: step timeline with animated checkmarks: Parsing → Drafting → Coverage → Gaps → Tighten → Review → Safe Fixes.  
- **Right**: **Live Draft Pane**: show `section_start` / stream `section_delta` / flash diff on `section_complete`. Mini TOC highlights the active section.  
- **Emit** extra events for UX polish:
  ```jsonc
  { "type":"section_thinking","data":{"key":"technical","message":"Analyzing requirements…"}}
  { "type":"heartbeat","data":{"ts": 1700000000 }}
  ```
- Close on `done`; auto‑scroll the draft page to **Top Fixes**.

**SSE (Node runtime, NDJSON lines):**
```jsonc
{ "type":"status", "data":{ "step":"drafting", "label":"Drafting sections…" } }
{ "type":"section_start", "data":{ "key":"technical","title":"Technical Volume" } }
{ "type":"section_delta", "data":{ "key":"technical","delta":"In Phase I we will…" } }
{ "type":"section_complete", "data":{ "key":"technical","words":1280 } }
{ "type":"coverage_update", "data":{ "key":"technical","completionPct":0.62,"missing":["Risks"] } }
{ "type":"gap_fixed", "data":{ "key":"commercial","label":"Market Size" } }
{ "type":"tighten_ok", "data":{ "key":"technical","toWords":4950 } }
{ "type":"tighten_reverted", "data":{ "key":"team" } }
{ "type":"fix_list", "data":{ "items":[ /* consolidated fixes */ ] } }
{ "type":"done", "data":{} }
{ "type":"error", "data":{ "message":"…" } }
```

**Reliability**
- **Reconnection**: on SSE error/close, auto‑retry after 1s/2s/5s (jittered), resubscribe and request **resumeFrom=lastEventId** (include server event ids).  
- **Optimistic UI**: buffer deltas locally; on `section_complete`, replace with server‑saved text.

**Acceptance**
- Within seconds of **Run Autopilot**, users see prose streaming for Section 1; steps tick; overlay closes on `done`; draft page shows **Top Fixes**.

---

### P0.2 Drag‑and‑Drop Uploads with **Auto‑Classification**
**Files:** `web/app/api/autopilot/upload/route.ts`, `web/components/sidebar/DocumentsPanel.tsx`, Prisma deltas below  
**What & Why:** Real inputs → better drafts. Recognize **RFP / Prior Proposal / CV / Boilerplate / Budget / Facilities / Other**.

**Server**
- Accept `.pdf/.docx/.txt/.md`; parse text: PDF (`pdf-parse`), DOCX (`mammoth`).  
- Heuristics (filename + text cues); **LLM fallback** on first 10–12k chars: returns `{ kind, confidence, topReasons[] }`.  
- Persist: `Upload.kind`, `Upload.text`, `Upload.meta:{ confidence, parsedChars, topReasons }`.

**UI**
- Dropzone shows parsing pills; completed cards show **kind badge**, filename, parsed chars, overflow menu → **Change kind**. Group by kind in **Documents** tab (left rail).

**Acceptance**
- Mixed files classify sensibly; users can override; docs immediately appear in Documents.

---

### P0.3 **Smart Citations** (inline [1], hovercards, Citations panel, export)
**Files:** `web/lib/citations/*`, `web/components/citations/*`, `web/app/api/autopilot/mine-facts/route.ts` (evidence), `web/app/api/autopilot/autodraft/route.ts`, `web/app/api/autopilot/fill-gap/route.ts`, Prisma deltas below  
**What & Why:** Grantable’s trust moment is seeing **inline citations** map to sources. We’ll transform `{{fact:ID}}` → **[1]** superscripts with hovercards and a right‑rail **Citations** panel (replacing the “Sources” counter in the screenshot).

**Implementation**
- **During uploads (PDFs): store page offsets**  
  - Extract text per page and store `Upload.meta.pageStarts: number[]` and `Upload.meta.pages: {index, textLen}` to map character ranges → page numbers.  
- **Fact miner upgrade**: facts include `{ evidence:{ uploadId, quote, page? }, strength: 0..1 }`. If `page` missing, **infer** by searching `quote` in page texts; save `page` if matched.
- **Section save hook**: when persisting `contentMd`, parse for `{{fact:ID}}` in order of appearance per section:  
  - Build a **unique, ordered list** of fact IDs → numbers starting at 1.  
  - Replace markers with `<sup class="cite" data-cite="n">[n]</sup>`.  
  - Persist mapping in `Section.citationsJson = [{ number, factId, uploadId, page, snippet, strength }]`.
- **Render**:
  - **Inline superscripts** `[n]` with hovercards showing filename, page, snippet, and a “Open document” action (opens **Documents** → source, scroll to page).  
  - **Right rail “Citations” tab** listing all `[n]` with the same details; clicking scrolls to the inline spot.
- **Deduping**: repeated `{{fact:ID}}` within a section maps to the same `[n]`. Citations **reset per section**.
- **Export**: DOCX includes a **References** section with `[n] filename, page, snippet…`

**Acceptance**
- Inline `[1]` renders with correct hovercard; Citations tab lists items with page numbers; export shows footnotes. Editing a section re‑numbers correctly on save.

---

### P0.4 Coverage Bars + Word Counts (auto‑refresh) + **Tighten Guard**
**Files:** existing coverage utils + tighten route  
**Behavior**
- Recompute coverage after **any mutation** (draft save, gap fill, tighten, patch); update UI.  
- If tighten would reduce `completionPct`, **revert** and toast “Kept required content intact.”

**Acceptance**
- Bars always accurate without manual recompute; tighten never lowers coverage.

---

### P0.5 Editor Parity Shell (toolbar, left Documents/Outline, right Assistant)
**Files:** `web/app/project/[id]/draft/page.tsx`, `web/components/editor/Toolbar.tsx`, `web/components/sidebar/DocumentsPanel.tsx`, `web/components/sidebar/OutlinePanel.tsx`, `web/components/assistant/AssistantPanel.tsx`  
**Parity with screenshot**
- Top toolbar (undo/redo, style, B/I/U, link, lists, alignment).  
- Left rail tabs: **Documents** (grouped by kind + “+ New document”) and **Outline** (sections with completion bars + word counts).  
- Right panel (Assistant): **Next Steps** (from mock review) + chat thread; **“Add this to my grant”** applies patch & re‑runs coverage.

**Acceptance**
- Layout matches the screenshots; toolbar basics work; panels toggle flawlessly.

---

### P0.6 **Top Fixes** surfaced + **Apply All Safe Fixes**
**Files:** `web/components/TopFixes.tsx`, mock‑review & apply routes  
**Behavior**
- **Top Fixes** card pinned at the top of the draft; items sorted by impact; actions **Apply** / **Open section**.  
- **Apply All Safe Fixes** appends non‑duplicate patches and respects word limits (recompute coverage each).

**Acceptance**
- Fixes appear immediately after review; Apply‑all succeeds without duplication or limit violations.

---

# P1 — Trust Layer, Search, & Auto‑Pack

### P1.1 **Facts Ledger 2.0** (cards, drag‑insert, source bubbles, evidence strength)
**Files:** Facts panel components & miner route  
**Behavior**
- Cards grouped by kind (Person/Prior Work/Metric/Resource/Claim/Citation).  
- **Drag‑to‑insert** adds an evidence sentence + `(Source: filename.pdf, p.12)` bubble and `data-fact-id`.  
- Show **strength** (dot indicator: weak/med/strong) based on miner’s `strength`.  
- Writers must embed `{{fact:ID}}` markers (hidden in render; render superscripts via P0.3).

**Acceptance**
- Drag/insert works; inline bubbles show; citation superscripts appear after save; strength dots visible.

---

### P1.2 **Omnibox (⌘/Ctrl‑K)** — Start simple, grow later
**Files:** `web/components/command/CommandK.tsx`, `/api/search`  
**Behavior**
- **Phase 1**: search sections + facts (fast).  
- **Phase 2**: include RFP/uploads.  
- Actions: **Copy** | **Insert with citation** (adds bubble + `[n]` mapping).

**Acceptance**
- ⌘K finds content and inserts with source reference; latency acceptable.

---

### P1.3 **Generic Auto‑Pack** (RFP → AgencyPack JSON)
**Files:** `/api/autopilot/generate-pack`, `lib/pack/fromRfp.ts`  
**Behavior**
- Input: `{ projectId, rfpUrl? , rfpUploadId? }`; parse up to ~50k chars.  
- LLM (JSON mode) returns pack with sections (ids/titles/limits/mustCover), rubric (ids/weights), attachments.  
- Store in `Project.meta.autoPack`; loader prefers it when present. Provide a “What we’ll write” preview.

**Acceptance**
- RFP → reasonable pack; Autopilot uses it; coverage/rubric coherent.

---

### P1.4 **Revision Modes** + Quick Wins (inline “magic wand”)
**Files:** `/api/autopilot/rewrite/route.ts`, editor UI buttons  
**Behavior**
- Inline buttons per section: **Make more technical**, **Add more metrics**, **Strengthen innovation**, **Address reviewer concern…**  
- Route takes `{ intent, sectionId, charter, facts }` → returns `after`. Persist a `Revision` row with `{before, after, intent}`; show diff & **Accept**/**Discard**.  
- **Quick Wins FAB**: “Find gaps” (coverage), “Add evidence” (mine facts), “Strengthen claims” (metrics+citations).

**Acceptance**
- Clicking a mode produces a diff view; accepting updates content + coverage; FAB actions work.

---

# P2 — Home/Tasks Parity & Polish

### P2.1 **Home Dashboard** (Welcome, Quick Access, Announcements, Learn)
**Behavior**: Mirror screenshot; Quick Access (Grants, Files, Org Profile, Settings), Announcements card, Learn cards. Add **“Start Autowriting now”** & **“Try Sample”** buttons.

### P2.2 **Tasks Drawer** (FTUE checklist — trimmed)
**Behavior**: 4 core steps (Start Application, Upload Source Material, Use AI Assistant, Explore Search). Expand to 7 later.

### P2.3 **DOCX Cosmetics**
**Behavior**: Title page with gradient band; headings/spacing polish; **References** section with citation list `[n]` (filename + page + snippet).

### P2.4 **Project Activity (Timeline)** — nice‑to‑have
**Behavior**: Save notable events (`progressEvents`); render compact feed.

---

## Reliability & State Management

- **SSE reconnection** with exponential backoff + `Last-Event-ID` resume.  
- **Client state**: use **Zustand** for overlay & editor state (live section buffers, citations map, coverage).  
- **Optimistic updates**: apply UI changes immediately; rollback on server mismatch.  
- **Rate limiting/queuing**: cap per‑run steps (≤2 gap fills/section), batch LLM calls where possible; simple in‑memory queue per project.

---

## Data Model Deltas (Prisma)

```prisma
model Upload {
  id         String   @id @default(cuid())
  projectId  String
  kind       String   // "rfp" | "prior_proposal" | "cv" | "boilerplate" | "budget" | "facilities" | "other"
  filename   String
  url        String?
  text       String?
  meta       Json?    // { confidence:number, parsedChars:number, topReasons:string[], pageStarts?:int[], pages?:{index:int,textLen:int}[] }
  Project    Project  @relation(fields: [projectId], references: [id])
}

model Project {
  id         String   @id @default(cuid())
  // existing fields …
  meta       Json?    // { autoPack?: AgencyPack, progress?: string[], progressEvents?: any[], t1?:string, t2?:string }
}

model Section {
  id         String   @id @default(cuid())
  projectId  String
  key        String
  title      String
  order      Int
  contentMd  String   @default("")
  slotsJson  Json?
  coverage   Json?    // { length:{words:number}, missing:string[], completionPct:number }
  citations  Json?    // [{number:int,factId:string,uploadId?:string,page?:int,snippet?:string,strength?:number}]
  Project    Project  @relation(fields: [projectId], references: [id])
}

model Revision {
  id        String   @id @default(cuid())
  sectionId String
  intent    String   // "more_technical" | "add_metrics" | etc.
  before    String
  after     String
  accepted  Boolean?
  createdAt DateTime @default(now())
}
```

*(Normalize citations later if needed; JSON is fastest to ship.)*

---

## API Contracts

**`GET /api/autopilot/stream?projectId=&resumeFrom?=`** (SSE)  
- Emits events above; include incremental `id` for resume.

**`POST /api/autopilot/generate-pack`**  
- `{ projectId, rfpUrl?, rfpUploadId? }` → stores `meta.autoPack`, returns `{ok, pack}`.

**`POST /api/autopilot/upload`**  
- Multi‑file; parse + classify; returns `{ uploadId, kind, confidence, parsedChars }[]`.

**`POST /api/autopilot/rewrite`**  
- `{ projectId, sectionId, intent, charter, facts }` → `{ after }`; also write `Revision`.

**`POST /api/search`** (Phase 1: sections + facts; Phase 2: +RFP/uploads)  
- `{ projectId, q }` → `[{ kind, snippet, source }...]`; has “Insert with citation.”

---

## Prompts (JSON‑safe)

**Generate Pack from RFP (auto‑pack)** — _system_  
```
From this RFP text, synthesize an agency pack for drafting.
Return ONLY JSON: {
 "id":"auto_<hash>","name":string,
 "sections":[{"id":string,"title":string,"limitWords":number,"mustCover":string[],"dependencies":string[]?}] ,
 "rubric":[{"id":string,"name":string,"weight":number}],
 "attachments":[{"name":string,"required":boolean}]
}
Prefer standard generic names when unspecified (Executive Summary, Problem/Need, Innovation/Approach,
Work Plan & Milestones, Team & Facilities, Impact/Stakeholders, Risks & Mitigations, Budget Justification).
```

**Write Section (streaming prose)** — _system_  
```
You write grant sections for non-technical founders.
Write ONLY Markdown for the section "{{SECTION_TITLE}}".
Use CHARTER and FACTS. When using a fact, embed {{fact:ID}} inline.
Target ~{{LIMIT_WORDS}} words (±10%). Clear, reviewer-friendly voice.
If budget or milestones are referenced, respect SECTION.dependencies where appropriate.
```

**Slots Check (fast JSON)** — _system_  
```
Mark MUST_COVER labels as "ok" or "missing" given the SECTION text.
Return ONLY JSON: {"slotsStatus":[{"label":string,"status":"ok"|"missing"}]}
```

**Fill Gap (patch)** — _system_  
```
Patch ONE missing slot with 2–5 concise sentences using CHARTER and FACTS only.
Do not duplicate existing content. If using a fact, embed {{fact:ID}}.
Return ONLY JSON: {"patchMd":string,"usedFactIds":string[]}
```

**Classify Document** — _system_  
```
Classify the document into: rfp | prior_proposal | cv | boilerplate | budget | facilities | other.
Return ONLY JSON: {"kind":string,"confidence":number,"topReasons":string[]}
```

**Mine Facts (with evidence & strength)** — _system_  
```
Extract atomic facts useful for grant writing with source evidence.
Return ONLY JSON array of {
 "id":string,"kind":"person"|"org"|"product"|"metric"|"priorWork"|"resource"|"claim",
 "text":string,"strength":number,
 "evidence":{"uploadId":string,"quote":string,"page":number?}
}
```

**Rewrite (revision modes)** — _system_  
```
Rewrite the section for intent={{INTENT}}.
Keep original meaning; preserve required slots; integrate FACTS where helpful (with {{fact:ID}}).
Return ONLY the rewritten Markdown.
```

---

## Editor/Overlay Components (visual parity)

- **Top toolbar** (undo/redo, style, B/I/U, link, lists, alignment).  
- **Left rail** tabs: **Documents** (grouped by kind) / **Outline** (sections with bars + counts).  
- **Right rail** tabs: **Assistant** (Next Steps + chat), **Citations** (list with page links), **Facts**, **Gaps**.  
- **MagicOverlay**: timeline + Live Draft Pane + progress stripe; skeleton text while waiting; glowing primary CTA.  
- **Progress Ring** in header (overall completion = avg `completionPct`), per‑section small rings next to titles (optional polish).  
- **Confidence chip** (if provided by model) near section header (low/med/high).

---

## QA (manual)

1) **Streaming FTUE**: choose pack or paste RFP → skip questions → drop a PDF → **Run Autopilot**.  
   - Live prose streams; steps tick; overlay closes; **Top Fixes** pinned.

2) **Smart Citations**: ensure inline `[1]` hover shows filename + page + snippet; Citations tab lists all; export adds **References**. Renumber after edits works.

3) **Auto‑classification**: drop mixed files; kinds correct; user override persists; Documents groups by kind.

4) **Facts & evidence**: facts show strength dots; drag‑insert adds `(Source: …, p.X)` bubble; after save, superscripts appear and map correctly.

5) **Coverage + Tighten Guard**: bars update after any change; tighten never lowers coverage (reverts with toast).

6) **Revision Modes**: run “More technical” on a section; diff view shows; Accept updates content + coverage.

7) **Omnibox P1**: ⌘K finds facts/sections; Insert with citation works.

8) **Export**: DOCX opens with title page and a clean **References** section of citations.

---

## Definition of Done (Plan4)

- New FTUE stepper + MagicOverlay with live streaming prose & reliable SSE (reconnect).  
- Drag‑and‑drop uploads auto‑classify and persist; PDFs indexed by page.  
- **Smart Citations** render inline [1] with hovercards, a Citations panel, and footnotes in DOCX.  
- Coverage bars auto‑update; **Tighten Guard** enforced.  
- Editor UI matches Grantable (toolbar, left Documents/Outline, right Assistant).  
- **Top Fixes** & **Apply All Safe Fixes** work.  
- Facts Ledger 2.0 with evidence & strength; Omnibox (Phase 1); **Generic auto‑pack** from RFPs.  
- Revision modes & Quick Wins available.  
- Home/Tasks polish queued for P2.
