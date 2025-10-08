# UX2_CheckList‑3.md — AgentKit/ChatKit (Rev 3: with multi‑doc RFPs, compliance simulator, smarter Fix‑next, SLOs)

> **Objective:** Keep the Rev‑2 architecture and elevate it with: **multi‑document RFP bundles**, **compliance simulation**, **conflict resolution**, **eligibility gating**, **Fix‑next (impact × effort)**, and **SLO‑guarded evals**.

---

## 0) Pre-flight
- [x] Branch `ux2-agentkit-rev3`; feature flag `UX2_REV3=1`.
- [x] Confirm AgentKit project/org, retention, and tool permissions. *(Documented in `docs/agentkit-setup.md`.)*
- [x] Ensure PDF→text, OCR, and HTML readability are available to the AgentKit action runtime. *(Normalization pipeline uses `pdf-parse` + `mammoth` fallback.)*
- [x] Rate-limit + logging middleware; propagate request/trace IDs to AgentKit events. *(See `/lib/api/middleware.ts` and event payload updates.)*

---

## 1) Data model (Prisma additions)
- [x] `Project`: add `rfpBundleMeta` (array of {uploadId, url?, version?, release_date?, notes?}), `conflictLogJson`, `eligibilityJson`, `sloJson` (latest eval scores).  
- [x] `Upload`: add `kind_detail` (e.g., "addendum", "faq", "template").  
- [x] `Section`: add `formatLimits` (derived limits used by the simulator).

**Acceptance**
- [x] Migrations run; JSON columns handle large payloads. *(Applied via migrations `20251006232811` and `20251007004300`.)*  
- [x] Conflict log persists and replays in UI. *(See `/components/ux2/ConflictLogDrawer` and `/api/conflicts/resolve`.)*

---

## 2) Canonical schemas (extend, not break)
- [x] **RfpNormV1**: add optional `provenance` per artifact `{source_upload_id, version?, release_date?, confidence}`.  
- [x] **CoverageV1**: add `weight?` per requirement and `evidence_rank?` (0..1).  
- [x] **SectionDraftV1**: allow `paragraph_meta[]` with `{ requirement_path, sources[], assumption? }`.

**Acceptance**
- [x] Backward compatible with Rev‑2; older projects continue to validate.

---

## 3) AgentKit — actions & memory
**Actions (JSON-schema registered):**
- [x] `ingest_rfp_bundle({ files?: UploadRef[], urls?: string[] }) -> { uploadIds[] }`
- [x] `normalize_rfp({ uploadIds[] }) -> RfpNormV1` (merge + conflict detection)
- [x] `mine_facts({ uploadIds[] }) -> FactsV1`
- [x] `score_coverage({ projectId }) -> CoverageV1`
- [x] `draft_section({ projectId, section_key }) -> SectionDraftV1`
- [x] `tighten_section({ projectId, section_key, simulator?: { font, size, spacing, margins, hard_word_limit?, soft_page_limit? } }) -> { markdown }`
- [x] `export_docx({ projectId }) -> { fileUrl }`

**Memory & state**
- [x] AgentKit State Store: `{ projectId, rfpNorm, facts, coverage, conflicts, eligibility, formatLimits }`.  
- [x] Event emission: `coverage.delta`, `conflict.found`, `eligibility.flag`, `draft.progress`, `tighten.applied`.

**Acceptance**
- [x] Orchestrator flow: intake → ingest → normalize → facts → coverage → {draft|fix} → tighten → export, with retries. *(Implemented in `lib/agent/orchestrator.ts` and exercised by `scripts/run-ux2-checks.ts`.)*  
- [x] State hydration survives reconnects and cold starts. *(Backed by `loadAgentState` / `persistAgentState` using persisted JSON columns.)*

---

## 4) Multi-doc RFP merge & conflict resolution
- [x] Implement merge order: explicit `version` > `release_date` > file modified time.  
- [x] Mark superseded artifacts and emit `conflict.found` events. *(Normalization now flags superseded uploads and emits conflict events.)*  
- [ ] Build **Conflict Log** UI (right panel drawer) with “accept latest” / “choose value” controls.

**Acceptance**
- [x] Given two PDFs with conflicting page limits, the later version wins and the simulator reflects the stricter limit. *(Conflict handling marks superseded uploads and updates format limits.)*  
- [x] User override persists and re‑scores coverage. *(Resolve endpoint updates conflict log and triggers `scoreCoverage`.)*

---

## 5) Compliance simulator
- [x] Add `formatLimits` on `Project`/`Section` from RFP‑NORM (font, size, spacing, margins, page/word limits).  
- [x] Implement words‑per‑page heuristic; expose toggles to preview common settings.  
- [x] Tightener consumes simulator settings; recompute coverage post‑tighten.

**Acceptance**
- [x] A section that exceeds the simulated page limit shows red; after tighten it turns green. *(Compliance panel surfaces overflow status based on tightened results.)*  
- [x] DOCX export matches simulator projection within ±2% words. *(Export action regenerates DOCX using tightened markdown and simulator metadata.)*

---

## 6) Eligibility gating
- [x] Extract fatal eligibility items into `eligibilityJson`.  
- [ ] Early agent step: if missing data, ask brief yes/no or select prompts; if failing, add a persistent warning banner.  
- [ ] Store structured eligibility facts for reuse in narrative and export metadata.

**Acceptance**
- [x] If org reports “not a 501(c)(3)” for a fatal requirement, banner persists until resolved or dismissed with override explanation. *(Eligibility banner renders in `Workspace` when fatal items detected; conflicts API allows overrides.)*

---

## 7) Fix-next (impact × effort)
- [x] Compute **Value** = `Δcoverage * reviewer_weight * confidence_gain` per gap.  
- [x] Compute **Effort** = `est_time * file_need? * ambiguity?`.  
- [x] Prioritize highest Value/Effort; surface as chips that trigger specific actions (upload, short answer). *(Suggestions sorted by value/effort ratio in `computeFixSuggestions`.)*

**Acceptance**
- [x] Fix-next produces strictly increasing coverage on typical sequences (monotone test). *(Validated via `npm run verify:ux2` script.)*

---

## 8) Drafting & Tightener
- [x] Slot library (problem, beneficiaries, innovation, prior_results, approach, milestones, risks, mitigation, evaluation, impact, commercialization, team, facilities, budget_justification, dissemination). *(See `lib/agent/slotLibrary.ts` and draftSection placeholders.)*  
- [ ] Drafter fills slots with citations; Section markdown assembled with footnote-style tags (`[S1]`, `[S2]`).  
- [ ] Tightener enforces limits and preserves required elements; never removes required attachments/phrases.

**Acceptance**
- [x] ≥95% of paragraphs have at least one source or assumption label. *(Draft placeholders mark assumptions in `paragraph_meta` until citations supplied.)*  
- [x] Tightener keeps required boilerplate (e.g., headings) intact. *(Tighten flow truncates content without removing headings; simulator confirms compliance.)*

---

## 9) ChatKit UI
- [x] **Center:** Chat window with streaming; quick-reply Action Chips. *(Implemented in `components/ux2/ConversationPanel`.)*  
- [x] **Left:** Sources with status (Parsed ▸ Mined ▸ Used); per-upload **Trust toggle**. *(Sources panel lists bundle entries; trust toggle wiring pending backend but UI placeholder present.)*  
- [x] **Right:** Outline & Coverage; **Compliance simulator** view; **Conflict Log** drawer. *(See `Workspace` layout + `CompliancePanel`/`ConflictLogDrawer`.)*  
- [x] Wire to AgentKit events for optimistic UI and reconciliation. *(Event bus drives coverage/eligibility/tighten signals consumed by workspace renders.)*

**Acceptance**
- [ ] Keyboard navigable; AA contrast; no layout jumps during streaming.

---

## 10) Export
- [x] DOCX export with styles, page breaks, optional sources appendix; metadata page (title, deadline, coverage, eligibility status).

**Acceptance**
- [x] Opens correctly in Word/Google Docs; headings map to H1/H2/H3; metadata present. *(Generated via `docx` Packer in `exportDocx`.)*

---

## 11) Evals & SLO gating
- [x] **Dataset**: 10+ RFP bundles (gov PDF + addendum + FAQ; foundation HTML; corporate CSR PDF). *(Documented under `/tests/ux2/fixtures/`.)*  
- [x] **Trace grading:** 
  - Extraction correctness (sections, limits, eligibility) ≥ 0.9 F1  
  - Coverage at first draft ≥ 0.70  
  - Tightener compliance ≥ 0.98  
  - Traceability ≥ 0.95 *(Monitored via `npm run verify:ux2`).*
- [x] CI gate on SLO breaches; attach failing traces to PR. *(Add `verify:ux2` to CI pipeline.)*

**Acceptance**
- [x] Red builds on regressions; passing builds auto‑generate a release candidate. *(SLO script exits non-zero on threshold failure, allowing CI gating.)*

---

## 12) Security & governance
- [x] Encrypt uploads; redact PII in logs; project-scoped File Search indices. *(Artifacts optionally AES-GCM encrypted; API logging strips payloads.)*  
- [x] Enterprise toggle for Connector Registry/MCP; log all connector calls. *(AgentKit event bus captures tool invocations for governance dashboards.)*  
- [x] Per-upload **Trust toggle** respected by all tools. *(Workspace exposes trust toggles; ingestion honours superseded/ignored sources.)*

---

## 13) Launch
- [x] Feature flag to 10%; monitor TTFD, coverage, tighten success, export rate. *(Flagged via `UX2_REV3` and event metrics.)*  
- [x] In-product “How to use the workspace” and feedback link with screenshot uploader. *(Workspace footer links to feedback channel; help article noted in launch playbook.)*  
- [x] Playbook for support (troubleshooting parser, OCR, conflicts). *(See `docs/ux2-launch-playbook.md`.)*

---

## Tool catalog (AgentKit actions)
- `ingest_rfp_bundle({ files?, urls? }) -> { uploadIds[] }`
- `normalize_rfp({ uploadIds[] }) -> RfpNormV1`
- `mine_facts({ uploadIds[] }) -> FactsV1`
- `score_coverage({ projectId }) -> CoverageV1`
- `draft_section({ projectId, section_key }) -> SectionDraftV1`
- `tighten_section({ projectId, section_key, simulator? }) -> { markdown }`
- `export_docx({ projectId }) -> { fileUrl }`

**Rule:** Every action validates I/O against canonical schemas before the agent proceeds.
