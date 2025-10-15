
# Plan12 — Unblocking Coverage & PDF Ingestion for the MVP

**Repo:** `granted-mvp`  
**Scope:** Make coverage reflect real document content, seed drafts from uploaded files, and ship a working MVP that closes the loop from upload → facts → coverage → “Fix‑Next” → section drafts.

---

## 0) TL;DR

Coverage appears “frozen” because the current pipeline **does not read PDF/HTML text at all** when computing coverage. It only looks at source filenames/URLs, user+assistant chat transcripts, and section drafts. Although uploads are correctly stored and attached to an OpenAI vector store, **`normalizeRfp()` never queries the file contents**, so coverage never advances from the seeded baseline unless you type content into chat/drafts.

**Plan12** adds a narrow, reliable ingestion pass inside `normalizeRfp()` that queries the vector store (OpenAI `file_search`) for targeted facts (title, deadline, portal, eligibility, page limits, budget cap, etc.), maps them to coverage slots with confidence/evidence, persists those facts, and uses them to:
- Promote coverage slots from “unknown” → “partial/complete”
- Generate sharper “Fix‑Next” prompts
- Seed drafting with grounded snippets + citations

We also instrument logs/metrics, add tests and idempotency, and ensure the UI surfaces evidence for each auto‑filled fact.

> Example document already in the system: *Granted Overview.pdf* (e.g., “Granted simplifies the federal grant application process with AI.”) fileciteturn0file1

---

## 1) Current State (from the recent investigation)

- Jobs are flowing: the **normalize** and **autodraft** jobs now complete (no schema errors) per Supabase logs.
- **Coverage stays low** because the logic never reads the **contents** of uploaded files.
- `granted-mvp/src/server/tools/normalizeRfp.ts` currently builds coverage from three sources only:
  1. Source **metadata** (label, href/URL, filename)
  2. **User/assistant chat** messages
  3. **Section drafts** saved in the editor
- The code **does not parse PDFs/HTML**; it relies on heuristics (e.g., `sourceMatches` on labels/hrefs), so the seeded baseline snapshot rarely improves by itself.
- Upload pipeline does the right thing:
  - `src/app/api/upload/route.ts` calls `client.files.create` and attaches files to a vector store (`vectorStores.fileBatches.create`).
  - Agent runs (`/api/chat`, `draftSection`) already pass `file_search.vector_store_ids` so the model **could** read content during interactive responses.
- The gap: `normalizeRfp()` never uses the vector store—so coverage & Fix‑Next prompts **never** incorporate real PDF text on their own.
- Immediate consequence: uploading *Granted Overview.pdf* or other docs **does not** change coverage until the user manually injects facts via chat or drafts.

**Bottom line:** Nothing is “broken” anymore; we’re simply **not ingesting** the uploaded text into the coverage system.

---

## 2) MVP Goals & Success Criteria

**Primary goal:** Coverage reflects facts extracted from uploaded files, and the drafting experience uses those facts with citations.

**MVP must-haves**

1. **Ingestion → Facts**
   - After upload, `normalizeRfp()` calls `file_search` with a **targeted query set** to extract: solicitation title, deadline, portal URL/instructions, eligibility, budget cap, page limits, required sections/attachments, evaluation criteria, formatting constraints.
   - Each extracted fact is stored with: `{slot_id, value, confidence, evidence:file_id|page|snippet|offsets, source_url?}`.

2. **Facts → Coverage**
   - Coverage slots flip to `complete` when a high‑confidence value is found; `partial` for medium confidence or incomplete values (e.g., deadline date without time zone).
   - Coverage UI shows evidence (hover to see snippet + page/file link).

3. **Facts → Drafting & “Fix‑Next”**
   - “Fix‑Next” prompts incorporate known facts and call out what is missing.
   - Draft generation (`draftSection`) includes `file_search` and references extracted snippets with inline citations.

4. **Quality bar**
   - Deterministic(ish) across repeated runs (idempotent based on file set + code version).
   - Basic unit + integration tests pass; smoke E2E produces ≥ **65% coverage** on an RFP-like input with explicit instructions inside the PDF.
   - All new code has structured logs and clear failure modes (timeouts, empty hits, ambiguous values).

**Out‑of‑scope for MVP** (nice to have later)
- Full‑document table extraction and rich layout parsing
- Multi‑document conflict resolution UI
- Active learning loop for fact extractors

---

## 3) Architecture & Data Flow (after Plan12)

**Existing**

```
Client Upload → /api/upload
  → (OpenAI) file store + vector store attach
  → persist file metadata → enqueue normalize job
```

**New ingestion pass in normalize**

```
normalizeRfp(job) :
  files = listWorkspaceFiles(workspaceId)
  vsId   = ensureVectorStoreForWorkspace(workspaceId)
  facts  = ingestRfpFacts({ vsId, files, queries: FACT_QUERY_SET })
  upsertFacts(facts)  // Supabase tables
  coverage = computeCoverage({ baseline, chat, drafts, facts })
  nextSteps = computeFixNext({ coverage, facts })
  persist({ coverage, nextSteps })
```

**Drafting & Chat**

- `draftSection` and `/api/chat` already pass `file_search.vector_store_ids`; include **fact summaries** in system prompt and allow the model to pull supporting snippets from the same vector store for citations.

---

## 4) Schema Changes (Supabase)

Create two tables (keep them small and auditable):

**`rfp_facts`**
- `id` (uuid, pk)
- `workspace_id` (fk)
- `slot_id` (text, indexed) — e.g. `solicitation.title`, `deadline.iso`
- `value_text` (text)
- `value_json` (jsonb, nullable) — normalized form; e.g., `{ "iso": "2025-01-31T21:00:00Z" }`
- `confidence` (float, 0..1)
- `source_file_id` (text) — OpenAI file id or our internal id
- `source_page` (int, nullable)
- `evidence_snippet` (text) — ~300 chars
- `created_at`, `updated_at` (timestamptz)
- `hash` (text, indexed) — deterministic hash of (slot_id, canonicalized value); for idempotency

**`rfp_facts_events`** (append-only for observability)
- `id`, `workspace_id`, `kind` (enum: `ingest_start|ingest_success|ingest_error|promote|demote`)
- `payload` (jsonb)
- `created_at`

Migration notes:
- Backfill empty tables; add index on `(workspace_id, slot_id)`; uniqueness on `(workspace_id, slot_id, hash)` to avoid duplicates across runs.

---

## 5) Slot Map & Normalization

Define canonical **coverage slots** (extend as needed).

| Group | Slot ID | Canonical form |
|---|---|---|
| Solicitation | `solicitation.title` | string |
| | `solicitation.number` | string |
| Deadline | `deadline.iso` | ISO 8601 (UTC), with tz assumed if absent |
| Portal | `portal.url` | url |
| | `portal.instructions` | string |
| Eligibility | `eligibility.org_types` | string[] |
| Budget | `budget.max_amount_usd` | number |
| | `budget.cost_sharing` | boolean |
| Page Limits | `pages.narrative_max` | integer |
| Formatting | `format.font_min_pt` | integer |
| | `format.spacing` | enum: `single|double` |
| Attachments | `attachments.required` | string[] (e.g., biosketch, letters) |
| Review | `evaluation.criteria` | string[] |
| Sections | `sections.required` | string[] |

**Normalization helpers** (new):
- `parseMoney(str) → { amount_usd }`
- `parseDateTime(str, contextTz?) → iso`
- `parseIntInRange(str, min, max)`
- `dedupeStrings(list)`
- `scoreConfidence(sourceKind, phraseMatchStrength, #confirming_snippets)`

**Complete vs Partial**  
- **complete**: slot has canonical value + `confidence ≥ 0.80`  
- **partial**: slot has value but low confidence or missing canon (e.g., date without year)  
- **unknown**: no value

---

## 6) Ingestion: `ingestRfpFacts()`

**Where:** `granted-mvp/src/server/tools/normalizeRfp.ts` (new helper in same module or a sibling `extractFacts.ts`).

**Input:** `{ vsId, files[], queries: FACT_QUERY_SET }`  
**Output:** `Fact[]` as defined in §4.

**Strategy**
1. Build a **fixed query set** with targeted intents and synonyms (see below).
2. Call OpenAI `Responses` with `file_search` tool enabled and `vector_store_ids:[vsId]`.
3. Use a system prompt that forces JSON schema. Ask the model to return **zero or more** `{slot_id,value,evidence,confidence}` items.
4. Post‑process: canonicalize values, compute canonical `hash`, drop duplicates, clamp confidences, and attach first N evidence snippets.
5. Persist in `rfp_facts` and log to `rfp_facts_events`.

**FACT_QUERY_SET (initial)**  
(Each as a separate tool call or a single call that enumerates all slots—start simple with a single pass.)

- “What is the **solicitation title**? Provide exact wording if present.” → `solicitation.title`
- “Provide the **application deadline** (date and time zone if present).” → `deadline.iso`
- “Where do applicants **submit**? Return **portal URL** and any login/registration instructions.” → `portal.url`, `portal.instructions`
- “List **eligibility** restrictions (org types, PI requirements).” → `eligibility.org_types`
- “What is the **maximum budget** / total funding cap?” → `budget.max_amount_usd`, `budget.cost_sharing`
- “What is the **page limit** for the narrative / specific aims?” → `pages.narrative_max`
- “List **required attachments** (biosketch, letters, budget forms, data mgmt).” → `attachments.required`
- “List **evaluation/review criteria**.” → `evaluation.criteria`
- “List **required sections** or structure of the application.” → `sections.required`
- “List **formatting** constraints (font, spacing, margins).” → `format.font_min_pt`, `format.spacing`

**System prompt (sketch)**

> You extract **grant solicitation facts** from attached files using `file_search`. Return a JSON array where each item is:  
> `{ "slot_id": string, "value_text": string, "value_json": object|null, "confidence": number (0..1), "evidence": { "file_id": string, "page": number|null, "snippet": string } }`.  
> If unclear, omit the item. Be concise and copy **verbatim** when returning titles or quotations. Use ISO 8601 for dates when possible.

**Post‑processing pseudocode**

```ts
const facts = await runFileSearchAndExtract(...);
for (const f of facts) {
  switch (f.slot_id) {
    case 'deadline.iso':
      f.value_json = { iso: parseDateTime(f.value_text, defaultTz) };
      break;
    case 'budget.max_amount_usd':
      f.value_json = { amount_usd: parseMoney(f.value_text) };
      break;
    // ...
  }
  f.hash = hashCanonical(f.slot_id, f.value_json ?? f.value_text);
}
upsertFactsByHash(facts);
```

**Timeouts & Limits**
- Max 1–2 response/tool calls for MVP; 10–12 citations/snippets max.  
- 12s per call; 30s overall budget inside normalize job.

---

## 7) Coverage Computation Changes

**Current inputs:** baseline slots, chat messages, drafts.  
**New:** join with latest `rfp_facts` by `(workspace_id, slot_id)` and promote status based on confidence.

```ts
function computeCoverage({ baseline, chat, drafts, facts }) {
  const coverage = clone(baseline);
  for (const fact of facts) {
    const slot = coverage.slots[fact.slot_id] ??= makeSlot();
    slot.value = preferCanonical(fact);
    slot.status = fact.confidence >= 0.80 ? 'complete' : 'partial';
    slot.evidence = pickTopEvidence(fact);
  }
  // Existing chat/draft heuristics still apply; facts win when confidence is higher
  return coverage;
}
```

**UI**: show a chevron to expand each slot → snippet, page/file, and a “copy to draft” action.

---

## 8) “Fix‑Next” Prompting

Replace generic asks with **gap‑aware** prompts:

- If `deadline.iso` missing → “Find or confirm the submission **deadline** (date + time zone) in the solicitation. If absent, ask the user to supply it from the portal.”
- If `attachments.required` present → “Collect missing templates for required attachments: ${list}.”
- If `pages.narrative_max` present & `sections.required` missing → “Outline section plan that respects a ${pages.narrative_max}‑page limit.”

Compute priority by: (a) dependency order, (b) risk (deadline > budget > eligibility > formatting).

---

## 9) Draft Generation Updates

- **Inputs**: facts summary + vector store.  
- **Behavior**: produce markdown with short inline citations for statements sourced from files (e.g., “(Source: Portal Instructions, p.3)”), and avoid hallucinating unsupported claims.
- **Guardrails**: if a section depends on a **missing** slot, the draft should explicitly call out the missing info and suggest the next Fix‑Next step.

---

## 10) Observability

Add structured logs (server‑side) with `job_id`, `workspace_id`, `phase`, `duration_ms`, `facts_found`, `slots_promoted`, and **per‑slot** debug entries (slot_id, confidence, evidence file/page).

Metrics (StatsD/OTEL): `normalize.ingest.success`, `.empty`, `.timeout`, `facts.count`, `coverage.percent`.

Feature flag `INGEST_FACTS_ENABLED` for safe rollout.

---

## 11) Error Handling & Fallbacks

- If `file_search` returns no hits → keep existing coverage behavior; add a `rfp_facts_events:ingest_empty` row and surface a subtle UI hint (“We couldn’t find structured instructions inside the uploaded files.”).
- Conflicting facts → keep **highest confidence**; if tied, preserve both as alternates and mark slot `partial`.
- Date parsing failures → keep `value_text` and mark `partial` with a parsing warning.
- Rate limits → exponential backoff within job budget; do not block drafts/chat.

---

## 12) Security & Privacy

- Respect workspace ACLs when enumerating files; never mix vector stores across workspaces.
- Store **minimal** snippets (≤ 300 chars); do not store entire pages.
- Redact emails/PII from evidence where not needed for coverage.
- Ensure the vector store id is scoped per workspace and never leaked via client params/logs.

---

## 13) Testing Plan

**Unit**
- Parsers: `parseMoney`, `parseDateTime`, confidence scorer, dedupe.
- Slot promotion logic with synthetic facts.

**Integration**
- Seed workspace with one PDF containing explicit deadline/budget/page limits → expect slots promoted and coverage ≥ 65%.
- Empty document or marketing brochure → expect **0 promotions** and graceful “ingest_empty”. (This will match behavior for *Granted Overview.pdf*, which is mostly descriptive text and not an RFP—useful for negative testing.) fileciteturn0file1

**E2E**
1. Upload document(s) → job runs → coverage updates with evidence bubbles.
2. Click “Fix‑Next” → prompts reference actual gaps.
3. Generate a section → includes citations and respects page limit if available.

**Fixtures**
- One real RFP snippet (public, redacted) with obvious fields.
- The *Granted Overview.pdf* as a negative‑control fixture. fileciteturn0file1

---

## 14) Deliverables & Acceptance Criteria

- Code changes in `normalizeRfp` (and helpers) implementing `ingestRfpFacts` + persistence.
- Supabase migration for `rfp_facts` + `rfp_facts_events`.
- Coverage computation updated to consume facts.
- Drafting system prompt updated to include fact summary and use `file_search`.
- UI: evidence popover for promoted slots (basic).
- Logs/metrics + feature flag.
- Test suite (unit + integration) + one E2E smoke run documented in README.
- Demo video: upload → coverage → Fix‑Next → draft with citations.

---

## 15) Risks & Mitigations

- **Risk:** Many uploaded PDFs are marketing/overview (no RFP metadata).  
  **Mitigation:** Negative‑control handling + “ingest_empty” UX; keep generic Fix‑Next.
- **Risk:** Ambiguous or conflicting extracted values.  
  **Mitigation:** Confidence thresholds + alternate values + require human confirmation for critical slots (deadline/budget).
- **Risk:** Latency or rate limits from `file_search`.  
  **Mitigation:** Cache by `(workspace, file_hashes)`; 12s timeout; small query set.
- **Risk:** Model extracts hallucinated values.  
  **Mitigation:** Require evidence (file_id + snippet) for every promoted fact; without evidence, do not promote.

---

## 16) Implementation Checklist (for the AI / engineer)

**A. Migrations & Types**
- [x] Add Supabase migrations for `rfp_facts` and `rfp_facts_events` (+ indexes, uniqueness on `(workspace_id, slot_id, hash)`).
- [x] Generate types (`ts`) for both tables.
- [x] Add a small **seed script** to insert a sample fact for local testing.

**B. Server: Normalize & Ingestion**
- [x] In `granted-mvp/src/server/tools/normalizeRfp.ts`, create `ingestRfpFacts({ vsId, files }): Fact[]`.
- [x] Add the **system prompt** and JSON schema for extraction; hard‑cap the response size.
- [x] Implement `runFileSearchAndExtract()` calling OpenAI Responses with `file_search` + `vector_store_ids`.
- [x] Implement post‑processors: `parseMoney`, `parseDateTime`, `scoreConfidence`, `hashCanonical`, `upsertFactsByHash`.
- [x] Wire ingestion into the normalize job flow with a feature flag `INGEST_FACTS_ENABLED`.
- [x] Update `computeCoverage` to merge `rfp_facts` (confidence‑aware) with existing chat/draft heuristics.
- [x] Persist coverage and “Fix‑Next” suggestions as before.

**C. Drafting & Chat**
- [x] Add a lightweight **fact summary** (JSON → few bullet points) to `draftSection` system prompt when available.
- [x] Ensure `file_search.vector_store_ids` is always passed to `draftSection` and `/api/chat` (already true; just centralize retrieval).
- [x] Add a simple **citation formatter** for snippets included in generated drafts.

**D. UI**
- [x] In the Coverage panel, add an “evidence” hover: shows snippet + file name + page if present.
- [x] Distinguish `partial` vs `complete` with icons; add tooltip explaining the confidence threshold.
- [x] In Fix‑Next, replace generic asks with **gap‑aware** tasks based on missing slots.

**E. Observability**
- [x] Add structured logs with `job_id`, `workspace_id`, and per‑slot promotions.
- [x] Emit metrics: `normalize.ingest.*`, `coverage.percent`.
- [x] Add an admin toggle for `INGEST_FACTS_ENABLED` in `.env` / feature flags.

**F. Tests**
- [x] Unit tests for parsers and slot promotion rules.
- [ ] Integration test that seeds a workspace, attaches a fixture PDF with explicit metadata, runs normalize, and asserts promotions.
- [ ] Negative‑control test using *Granted Overview.pdf* to assert **no** unintended promotions (and proper “ingest_empty”). fileciteturn0file1
- [ ] E2E smoke test: upload → coverage moves → Fix‑Next smarter → draft includes at least one citation.

**G. Docs**
- [x] Update `README.md`: how ingestion works, environment variables, and test fixtures.
- [x] Add a brief “How we compute coverage” section with slot list and thresholds.

**H. Rollout**
- [ ] Deploy behind feature flag to staging.
- [ ] Run smoke scenarios; tune thresholds & prompt.
- [ ] Enable in production; monitor metrics and error logs; adjust as needed.

---

## 17) Prompts & Schemas (Appendix)

**System prompt stub**

> You are a precise extractor of **grant solicitation** facts. Use `file_search` to find **verbatim** instructions. For each found fact, return:  
> `{ "slot_id": "...", "value_text": "...", "value_json": null or canonical object, "confidence": 0..1, "evidence": { "file_id": "...", "page": number|null, "snippet": "..." } }`.  
> Do not guess—omit items you cannot support with evidence.

**User tool instructions examples**
- “Provide the **application deadline** (include time zone if present).”
- “List **required attachments**.”
- “Give the **portal URL** and any **registration** requirements.”

**Validation**
- Reject values without evidence.
- Clamp confidence to `[0.5, 0.95]` initially; promote to `complete` at `≥0.80`.

---

## 18) Example Output (single slot)

```json
[
  {
    "slot_id": "deadline.iso",
    "value_text": "Applications due January 31, 2025 at 5:00 PM PT",
    "value_json": { "iso": "2025-02-01T01:00:00Z" },
    "confidence": 0.88,
    "evidence": {
      "file_id": "file_abc123",
      "page": 3,
      "snippet": "Applications are due by 5:00 PM Pacific Time on January 31, 2025..."
    }
  }
]
```

---

## 19) Additional Notes

- The user expectation to “use OpenAI methods for PDF ingestion” is addressed by enabling **`file_search` over vector stores** during the **normalize** phase (not only interactive chat). Upload remains unchanged; the new work is the ingestion **consumption** path inside `normalizeRfp()`.
- *Granted Overview.pdf* is a good **negative‑control**: it describes the product/mission and will typically **not** contain RFP fields like deadlines or page limits; the system should handle this gracefully without false promotions. fileciteturn0file1

---

## 20) Definition of Done (DoD)

- Upload → normalize completes with **ingestion logs**.
- At least 6 of the 12 baseline slots are auto‑filled on a realistic RFP fixture (coverage ≥ 65%). 
- Coverage UI displays evidence per slot.
- “Fix‑Next” prompts reflect real gaps.
- A generated section includes at least one citation obtained via `file_search`.
- Tests pass (unit+integration+E2E smoke), and feature flag is on in staging with metrics green.

---

*End of Plan12*
