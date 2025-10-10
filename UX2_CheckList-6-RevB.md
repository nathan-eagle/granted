# UX2_CheckList-6.md — Minimal Conversation UI on Agents SDK (Autodraft‑first, **Rev B — aligned to latest code**)

**Objective:** Keep the UI one‑screen and momentum‑driven. With Agents SDK now wired and **agent sessions + memory persisted**, stream a credible first draft as fast as possible. Default to **local facts + File Search (Vector Store)**; keep **Web Search** behind a per‑run toggle.

> This revision aligns naming, envs, and flows with the latest code changes (agent **session** endpoints, **OpenAI Files** ingestion, **session backfill**, and the new **workspace**).

---

## 0) Baseline hygiene (envs & idempotence)
- [x] Envs (document in README and `.env.example`):
      - `OPENAI_API_KEY`
      - `OPENAI_MODEL_FAST`, `OPENAI_MODEL_PRECISE`
      - `UX2_ENABLED` (server), `NEXT_PUBLIC_UX2_ENABLED` (client)
      - (optional) `OPENAI_PROJECT` or org scoping if required by your Agents config
- [x] Default models: **FAST** for autodraft; **PRECISE** for tighten/patch only.
- [x] Idempotence for uploads: store `Upload.meta.checksum` and skip re‑parsing/mining if unchanged.
- [x] Remove legacy dashboard routes/components; **workspace** is the new entry.

**Acceptance**
- [ ] First streamed token < 3s on fixture RFP when embeddings cached.
- [x] Env list matches code; toggling `NEXT_PUBLIC_UX2_ENABLED` switches to the new workspace.

---

## 1) UI shell (single page)
- [x] Route: `/app/agent/[projectId]/page.tsx` with **three affordances** only:
      1) **Add files** (RFP URL/PDF + optional support)  
      2) **Start** (Autodraft)  
      3) **Export** (appears after first draft)
- [x] Draft pane: read‑only markdown; tiny provenance chips (`[RFP]`, `[ORG]`, `[BIO:Jane]`).
- [x] Composer: one line with attached file chips and minimal status line.
- [x] Hide **Tighten** until at least one section exists; then show per‑section.

**Acceptance**
- [x] Never more than **one primary button** visible (Start → Fix‑next → Export).

---

## 2) Streaming & progress (Agents SDK events)
- [x] Use Agents SDK **streaming** to render token deltas into the Draft pane.
- [x] One‑line status: “Working: ingest → normalize → draft_section …”; compact “activity dots” for tool phases.
- [x] Stop on `final_output`; persist assembled markdown by section.

**Acceptance**
- [x] Summary paragraph visible within **30–60s** on fixtures.
- [x] Status line stays stable; no verbose logs in UI.

---

## 3) Sessions & state (server‑side memory)
- [x] Create **one Agents SDK session per project**; persist `agentSessionId` on `Project`.
- [x] **Backfill** a session for existing projects on first open (if none).
- [x] Reuse the same session for all turns (built‑in memory).
- [x] `GET /api/agent/session/[id]` returns metadata for quick restore after reload.

**Acceptance**
- [x] Refresh resumes the draft without re‑running tools.
- [x] Old projects gain a session on open and proceed normally.

---

## 4) Tools configuration (default File Search)
- [x] **FileSearchTool** enabled by default; **WebSearchTool** attached **only** when the user toggles “Allow web lookups”.  
- [x] Create a **Vector Store per project** lazily at first upload; attach **OpenAI Files** to it.
- [x] Persist pointers:  
      - `Project.meta.vectorStoreId`  
      - `Upload.meta.openaiFileId`
- [x] Poll vector store **file indexing** until status is not `in_progress` before relying on file search for that file.

**Acceptance**
- [ ] With WebSearch off, drafts complete using only local files + org site.
- [x] Vector store/file pointers present on newly ingested uploads.

---

## 5) Draft output shaping (schema‑first)
- [x] Validate with zod: `RfpNormV1`, `FactsV1`, `CoverageV1`, `SectionDraftV1`.
- [x] Server‑side **combiner** returns:
      ```ts
      type FirstDraftV1 = {
        projectId: string;
        sections: Array<{ key: string; title: string; markdown: string; paragraph_meta?: any[] }>;
        coverage?: number;
      };
      ```
- [x] UI always renders a single `FirstDraftV1` object.

**Acceptance**
- [x] Renderer has zero section‑specific branching.

---

## 6) API surface (align with new **session** endpoints; streamed)
- [x] `POST /api/agent/session` → start **or** continue: body `{ projectId, text?, allowWebSearch? }` → streams events + partial draft.
- [x] `POST /api/agent/session/[id]` → continue/act: body `{ text?, action? }` (e.g., `tighten`, `export`) → streams updates.
- [x] Attach tools conditionally per turn (FileSearch always; WebSearch if `allowWebSearch===true`).
- [x] Secure with NextAuth; return 401 when unauthenticated.

**Acceptance**
- [x] A single pair of “session” endpoints powers the entire UI; latency logged per action.

---

## 7) Autodraft flow (happy path, no confirmation step)
- [x] On **Start**:
      1) If new files: `ingest_rfp_bundle` (or simple `ingest_rfp`) → upload to **OpenAI Files** and attach to the project’s Vector Store.
      2) `normalize_rfp` → `RfpNormV1` (sections + limits + attachments + deadline).
      3) `mine_facts` (org URL + support docs).
      4) `score_coverage`.
      5) **Draft Summary first** (`draft_section`), stream immediately.
      6) Draft next core sections while Summary renders.
      7) Merge into `FirstDraftV1` as content arrives.
- [x] If vector store indexing is still in progress, **draft from org site + idea** first, then **patch** in RFP‑anchored details when ready.

**Acceptance**
- [x] User sees a readable Summary before any choices.
- [x] Coverage increases monotonically as sections stream.

---

## 8) Tighten (1‑click, contextual)
- [x] Show **Tighten** beside each drafted section.
- [x] Call `tighten_section` with formatting constraints (margins, font, spacing, word/page limits).
- [x] Replace section markdown; show word/page count + status (“ok/overflow”).

**Acceptance**
- [x] Tighten meets limits; never removes required boilerplate.

---

## 9) Observability (just what helps speed & quality)
- [x] Record per run:
      - `ttft_ms` (time to first token),
      - `ttfd_ms` (time to first full draft),
      - tool call counts & durations,
      - model name; `projectId`; `agentSessionId`.
- [x] Persist to `AgentWorkflowRun` (or equivalent) keyed by session.
- [x] Add a tiny CI smoke test over 3 fixtures: start → autodraft → tighten; assert coverage rises and `ttfd_ms` < budget.

**Acceptance**
- [x] CI passes on the 3‑RFP micro‑set; regressions block merges.

---

## 10) Export (just DOCX in v6)
- [x] **Export DOCX** → invoke `export_docx` and download.
- [x] Defer Google Docs/Notion integrations to keep scope minimal.

**Acceptance**
- [x] Exports open correctly in Word/Google Docs with proper headings.

---

## 11) Micro‑interactions that reduce friction
- [x] Auto‑start drafting when **RFP + org URL + 2–3 sentence idea** exist; show a 3‑sec “Starting draft… Cancel” chip.
- [x] Replace “Top 3 gaps” with **one Fix‑next** chip; on resolve → auto‑advance.
- [x] Default‑on **Assumption** labels for unevidenced claims (tooltip suggests what to add).

**Acceptance**
- [x] Median clicks to the first draft ≤ **1** after attaching the RFP.

---

## 12) Cleanup & docs
- [x] README: document the **session** endpoints, envs, and the “Web Search” toggle behavior.
- [x] Trim legacy components into `deprecated/` for one release; remove next release.
- [x] Note privacy posture (encryption at rest, PII redaction, per‑project vector store).

**Definition of Done (v6)**
- [x] A first‑time user gets a **visible Summary** in ≤ 60s and a **full first draft** within minutes from: RFP + org URL + 2–3 sentence idea.
- [x] Draft is **traceable** (chips link to RFP/uploads; assumptions labeled).
- [x] **Tighten** meets limits; **Export DOCX** works.
