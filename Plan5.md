
# Plan5.md — From Messy to Magical: **Emergency Fix + Conversational AI + Grantable Parity**

**Status:** CRITICAL — fix broken flows first, then layer the “wow.”  
**Goal:** A **working, beautiful, interactive** app that streams a first draft fast, lets users chat and act while it writes, handles real documents, and exports cleanly. Plan5 updates the previous plans and folds in the best ideas from your notes.

This plan builds on **Plan3B** (Live Draft Pane, Coverage Bars, Progress Log, Advanced drawer, Facts drag‑insert, Try Sample, DOCX polish) but **reprioritizes** around triage + trust. fileciteturn0file0

---

## 🔧 What is broken today (triage facts)
- **Buttons**: Regenerate Draft/Export DOCX don’t fire; Run Autopilot re‑writes everything blindly.  
- **Uploads**: PDFs fail; no Node runtime; no parsers; no progress; no classification.  
- **Outline**: duplicates, not clickable; no scroll‑to‑section.  
- **Assistant**: no chat; no conversational FTUE; not interactive.  
- **Questionnaire**: not visible on project creation.  
- **Project mgmt**: cannot delete projects.  
- **General polish**: no toasts, no skeletons, no visible progress.

**Target**: Reliable core flows + Grantable‑grade UI + streaming “theatre.”

---

# P0 — **Stabilize Core UX** (ship first, smallest shippable slices)

### P0.1 Wire buttons to working endpoints + visible feedback
**Symptoms:** Dead buttons; no spinners/toasts; “Run Autopilot” clobbers existing text.

**Actions**
1) **Routes**
   - `POST /api/autopilot/rerun` → smart rerun (see P0.4).  
   - `POST /api/autopilot/regenerate-section` → *one* section only.  
   - `GET  /api/export/docx?projectId=` → stream DOCX (see P0.6).
2) **UI**
   - Disable while running; show spinner text; toast success/error (3s, non‑blocking).  
   - Confirm dialog on **full regenerate** (“This will replace sections X/Y/Z”).

**Acceptance**
- All 3 buttons **respond**, show progress, and complete. No silent failures.

---

### P0.2 Uploads that “just work” (PDF/DOCX/TXT/MD) + auto‑classification
**Symptoms:** PDF upload fails; “Upload failed.”

**Server (Node runtime route)**  
`web/app/api/autopilot/upload/route.ts`
- `export const runtime = 'nodejs'` + `dynamic = 'force-dynamic'`.  
- Parse multipart via `request.formData()`; cap per‑file size at 20MB; send **HTTP 413** for oversized.  
- Parsers: **pdf-parse** (PDF) → also store per‑page text & `meta.pageStarts` for citation pages; **mammoth** (DOCX); pass‑through TXT/MD.  
- **Auto‑classify** (heuristics + LLM fallback on first 10–12k chars):  
  `rfp | prior_proposal | cv | boilerplate | budget | facilities | other` → store `{ kind, confidence, topReasons[] }` in `Upload.meta`.
- **Persist** in a transaction. Return `{ uploadId, kind, confidence, parsedChars }`.

**Client**  
- Dropzone shows a **pill per file**: “Parsing… → Classified as RFP (0.93)” and a **kind dropdown** for manual override.  
- Group in **Documents** list by kind.

**Acceptance**
- Drag‑drop mixed files → appear grouped by kind with confidence. No Edge runtime errors.

---

### P0.3 Clickable, deduped Outline + smooth scroll
**Symptoms:** Duplicates; no navigation.

**Actions**
- Ensure unique **`Section.key`** (overview|technical|commercial|team|budget).  
- Add `id="sec-${key}"` on headings.  
- Outline items call `scrollIntoView({behavior:'smooth'})`; IntersectionObserver toggles **active** highlight.  
- Keyboard ↑/↓ navigates sections; Enter focuses editor.

**Acceptance**  
- No duplicates; click or keys scroll to the right section with active state.

---

### P0.4 Smarter Autopilot modes (no more clobbering)
**Symptoms:** “Run Autopilot” re‑writes everything.

**Actions**
- Add orchestrator **modes**:  
  - `first_run` — full pipeline (facts → draft → coverage → gaps → tighten → review → safe fixes).  
  - `rerun_smart` — only sections with missing slots **or** user‑selected ones; reuse facts; keep others intact.  
  - `fill_gaps_only` — skip writing, just fill missing slots (≤2/section) + tighten/check.  
- UI: default **Run Autopilot** = `rerun_smart`; move manual tools to **Advanced** drawer (Plan3B). fileciteturn0file0

**Acceptance**  
- Rerun leaves good sections untouched; per‑section regenerate is available.

---

### P0.5 Add the **Assistant panel** (chat + “Add to grant”) and **conversational intake**
**Symptoms:** No chat; no FTUE questionnaire.

**Actions**
- **Right rail** tabs: **Assistant** (chat) | **Next Steps** (top fixes + gaps).  
- **Conversational FTUE**: if `Project.charterJson` missing, Assistant asks the **six questions**; replies save to `charterJson`. Provide **Skip** and **Use my uploads** quick actions.  
- **Chat streaming** API `POST /api/assistant/chat` (Node runtime; stream tokens).  
- **“Add this to my grant”** action creates a patch to the **active section**, appends, and triggers coverage.

**Acceptance**
- Chat appears on the right; answering questions saves data; “Add to grant” updates content + coverage instantly.

---

### P0.6 Export DOCX that always downloads
**Symptoms:** No download.

**Actions**
- `GET /api/export/docx?projectId=` returns a `.docx` with headers:  
  `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document`  
  `Content-Disposition: attachment; filename="Granted - Draft.docx"`  
- Strip Markdown robustly (avoid artifacts). Add section headings and a budget table if present.

**Acceptance**  
- Clicking **Export DOCX** always saves a Word‑readable file.

---

### P0.7 Project deletion (soft delete)
**Symptoms:** Can’t delete projects.

**Actions**
- Add `deletedAt` to `Project`.  
- `POST /api/projects/delete` → mark soft delete; redirect to list.  
- Hide deleted from queries.

**Acceptance**  
- Project disappears from UI and becomes inaccessible.

---

# P1 — **Trust + Parity** (after P0 is stable)

### P1.1 Magic Overlay + Live Draft Pane (SSE theatre)
- `GET /api/autopilot/stream` (Node runtime, NDJSON). Show **timeline** (Parsing → Drafting → Coverage → Gaps → Tighten → Review → Safe Fixes) and a **Live Draft Pane** that streams prose per section.  
- **Reliability**: heartbeat events; SSE **reconnect** with jitter; resume via `Last-Event-ID`.

**Acceptance**  
- Within seconds of **Run Autopilot**, users watch the draft being written; overlay closes on done.

---

### P1.2 Smart citations (inline [1], hovercards, Citations panel, DOCX references)
- Facts must include `{ evidence:{ uploadId, quote, page? }, strength }`. Infer `page` by matching `quote` in per‑page text if missing.  
- On section save, replace `{{fact:ID}}` → `<sup data-cite="n">[n]</sup>`; persist mapping in `Section.citations` (JSON).  
- **Right rail “Citations”** tab lists `[n] filename, page, snippet, strength`; clicking scrolls to inline.  
- Export adds **References** section listing `[n]` items.

**Acceptance**  
- Inline [1] hover shows source; Citations tab accurate; DOCX has references.

---

### P1.3 Documents sidebar parity
- Left rail tabs: **Documents** (grouped by kind + “+ New document”) and **Outline** (completion bars, word counts).  
- Actions: **Open source**, **Copy snippet**, **Insert with citation**.

**Acceptance**  
- Sidebar matches Grantable vibe; actions work.

---

### P1.4 Coverage + Tighten Guard (auto refresh)
- Recompute after *every* mutation; if tighten would drop completion, **revert** and toast “Kept required content intact.”

**Acceptance**  
- Bars never stale; shorten never deletes required content.

---

# P2 — **Search + Editor polish + Home parity**

### P2.1 Omnibox (⌘/Ctrl‑K), ship in 2 phases
- **Phase 1:** search sections + facts; actions **Copy** | **Insert with citation**.  
- **Phase 2:** include RFP/uploads corpus.

### P2.2 Editor toolbar + micro‑interactions (Grantable style)
- Toolbar: undo/redo, style, B/I/U, link, bullets, numbers, alignment.  
- Microcopy + animations: checkmarks pop, patch highlights fade, save toasts, skeleton lines.

### P2.3 Home dashboard + Tasks drawer (lean)
- Dashboard with **Welcome**, **Quick Access** (Grants/Files/Org Profile/Settings), **Announcements**, **Learn** tiles; **Start Autowriting** and **Try Sample** CTAs.  
- Right **Tasks drawer** (4 steps now; expand later).

---

## Engineering details

### Routes to add/fix
- `GET  /api/autopilot/stream?projectId=&resumeFrom?=` — SSE (Node).  
- `POST /api/autopilot/rerun` — `{projectId, mode:"rerun_smart"|"fill_gaps_only"}`.  
- `POST /api/autopilot/regenerate-section` — `{projectId, sectionId}`.  
- `POST /api/autopilot/upload` — Node runtime, parsers, classification.  
- `GET  /api/export/docx?projectId=` — DOCX stream.  
- `POST /api/projects/delete` — soft delete.  
- `POST /api/assistant/chat` — streaming chat for Assistant panel.

### Client state & reliability
- **Zustand** store for overlay/editor: active step, live section buffers, coverage, citations map.  
- **Optimistic** apply/rollback around mutations.  
- **Rate limiting**: cap gap‑fills (≤2/section/run), batch LLM calls.

### IDs & scrolling
- Stable `Section.key`; heading anchors `#sec-key`; outline uses anchors; IntersectionObserver marks active.

### Style tokens (global)
- Inter (+ optional Plus Jakarta for H1/H2), dark theme, soft radius (14px), gradient primary button (violet→cyan), subtle shadows, tasteful skeletons.

---

## Minimal Prisma deltas

```prisma
model Project {
  id         String   @id @default(cuid())
  title      String?
  agencyPackId String
  status     String    @default("draft")
  charterJson Json?
  factsJson   Json?
  meta        Json?    // { autoPack?: AgencyPack, chat?:any[], progress?:string[], t1?:string, t2?:string }
  deletedAt   DateTime?
  sections    Section[]
  uploads     Upload[]
}

model Section {
  id         String   @id @default(cuid())
  projectId  String
  key        String   // stable
  title      String
  order      Int
  contentMd  String   @default("")
  slotsJson  Json?
  coverage   Json?    // { length:{words}, missing:string[], completionPct:number }
  citations  Json?    // [{number:int,factId:string,uploadId?:string,page?:int,snippet?:string,strength?:number}]
  Project    Project  @relation(fields: [projectId], references: [id])
}

model Upload {
  id         String   @id @default(cuid())
  projectId  String
  kind       String   // rfp|prior_proposal|cv|boilerplate|budget|facilities|other
  filename   String
  url        String?
  text       String?
  meta       Json?    // { confidence:number, parsedChars:number, topReasons:string[], pageStarts?:int[] }
  Project    Project  @relation(fields: [projectId], references: [id])
}
```

---

## Prompts (JSON‑safe, short)

**Classify Document (LLM fallback)**
```
Classify the document into: rfp | prior_proposal | cv | boilerplate | budget | facilities | other.
Return ONLY JSON: {"kind":string,"confidence":number,"topReasons":string[]}
```

**Write Section (streaming prose)**
```
You write grant sections for non-technical founders.
Write ONLY Markdown for section "{{SECTION_TITLE}}".
Use CHARTER and FACTS. If using a fact, embed {{fact:ID}} inline.
Target ~{{LIMIT_WORDS}} words (±10%). Clear, reviewer-friendly voice.
```

**Slots Check**
```
Mark MUST_COVER labels as "ok" or "missing" given SECTION text.
Return ONLY JSON: {"slotsStatus":[{"label":string,"status":"ok"|"missing"}]}
```

**Fill Gap**
```
Patch ONE missing slot with 2–5 sentences using CHARTER and FACTS only.
Do not duplicate existing content. If using a fact, embed {{fact:ID}}.
Return ONLY JSON: {"patchMd":string,"usedFactIds":string[]}
```

**Assistant Chat (contextual)**
```
Be a concise, helpful grant-writing assistant. Use the project's CHARTER, AGENCY_PACK, and FACTS.
Offer specific suggestions. When the user asks to add content, produce a short patch suitable for the current section.
```

---

## QA / Acceptance checklist

**Buttons + feedback**
- [ ] Regenerate section, rerun smart, export all work with spinners/toasts and no silent failures.

**Uploads**
- [ ] PDF/DOCX/TXT/MD parse; documents auto‑classified; errors surfaced; visible progress.

**Outline**
- [ ] Unique items; click/keys scroll to sections; active highlight follows scroll.

**Assistant**
- [ ] Chat loads on right; conversational six‑question FTUE persists to charter; “Add to grant” patches active section and updates coverage.

**Autopilot**
- [ ] `first_run` streams prose & finishes with Top Fixes; `rerun_smart` touches only incomplete or selected sections; `fill_gaps_only` works.

**Export**
- [ ] DOCX downloads every time and opens cleanly.

**Delete**
- [ ] Project can be soft‑deleted and disappears from lists.

**Parity & trust (P1)**
- [ ] Magic Overlay streams real prose; citations [1] render with hovercards and Citations panel; DOCX contains a References section.

---

## Install / dependencies

```bash
npm install pdf-parse mammoth docx
npm install zustand
npm install @radix-ui/react-popover @radix-ui/react-dialog
npm install framer-motion
# (later) @tiptap/react @tiptap/starter-kit @tiptap/extension-link
```

---

## Rollout order (fastest visible wins)
1) **P0.2 Uploads** → unblock value immediately.  
2) **P0.1 Buttons** → app feels alive (spinners/toasts).  
3) **P0.3 Outline** → navigation fixed.  
4) **P0.5 Assistant** → interactive FTUE + patch‑apply.  
5) **P0.4 Smart rerun** → no more clobber.  
6) **P0.6 Export** and **P0.7 Delete**.  
7) **P1** (Streaming overlay + citations + docs sidebar), then **P2** (Omnibox, editor polish, home parity).

---

## Success metrics (track)
- **Time‑to‑first visible prose** < 10s after Run Autopilot.  
- **Upload success rate** ≥ 98% (PDF/DOCX/TXT/MD).  
- **Run completion rate** ≥ 95% without manual retries.  
- **Fix adoption**: ≥ 60% of users click “Apply a fix” once per project.  
- **Export success** ≥ 99%.
