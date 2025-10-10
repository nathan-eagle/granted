Granted (Next.js + Prisma)

Local development
- Copy `.env.example` to `.env.local` and fill values. Required keys:
  - `OPENAI_API_KEY`, `OPENAI_PROJECT` (optional)
  - `OPENAI_MODEL_FAST`, `OPENAI_MODEL_PRECISE`
  - `UX2_ENABLED`, `NEXT_PUBLIC_UX2_ENABLED`
  - `AGENTKIT_PROJECT_ID`, `AGENTKIT_WORKFLOW_ID`
- Use Node 20 (`$HOME/.local/node-v20.17.0-darwin-x64/bin/node` or `nvm use 20` if available).
- `npm install`
- `npx prisma migrate dev`
- `npm run dev`

Deploy notes
- Root directory is `web/`.
- Install: `npm ci`
- Build: `npm run build`
- Output: `.next`

### Agents SDK endpoints
- `POST /api/agent/session`
  - Body: `{ projectId, text?, messages?, allowWebSearch? }`.
  - Sends back a streaming `text/event-stream` when `Accept: text/event-stream`; emits `status`, `section_delta`, `section_complete`, `coverage`, and `done` events as the draft materializes.
  - Non-stream consumers receive `{ sessionId, reply, memoryId, draft, logs }`.
- `GET /api/agent/session/{sessionId}` → restore workspace state on reload; returns `{ draft, uploads, preferences.allowWebSearch, context: { orgUrl, projectIdea } }`.
- `POST /api/agent/session/{sessionId}` → continue a session with free-form messages or `action` payloads (e.g., `{ action: "tighten", sectionKey }`).
- `POST /api/autopilot/upload` → multipart ingest entry point; stores uploads, indexes them in the project vector store, and emits ingestion events tied to the session.
- `PATCH /api/projects/{projectId}/meta` → persist workspace context (`orgUrl`, `projectIdea`) used by the auto-start countdown and the facts miner. Empty strings remove existing values.
- Smoke tests: `npm run verify:ux2` exercises deterministic checks and optionally calls the API when `APP_URL` is set.

**Web Search toggle**
- Default is off; the workspace persists the toggle per project (`project.meta.allowWebSearch`).
- Turn on by passing `allowWebSearch: true` to session endpoints or toggling the checkbox in the UI. When disabled, the agent confines itself to local files + org site.

**Observability & metrics**
- Every streamed session logs `ttft_ms`, `ttfd_ms`, tool runtimes, and the model id on `AgentWorkflowRun`.
- `npm run verify:ux2` asserts synthetic coverage improvements across three fixtures and validates the latest run metrics (when `DATABASE_URL` is set).

### Blueprint mapper
- Endpoint: `POST /api/blueprints/map` with `{ projectId, rfpId, blueprintId }`.
- Admin helper: `/project/:id/map` surfaces a simple form so you can trigger the mapper after ingesting an RFP.
- Maps `Requirement` rows onto blueprint sections (currently NSF SBIR) using OpenAI classification when available and lexical similarity fallback, updating section limits + stored requirements.

### Agent full-run orchestrator
- Endpoint: `POST /api/agent/full-run` with `{ keyword, projectName, simplerId?, opportunityId?, blueprintId? }`.
- Runs search → ingest → attachments → apply blueprint → map → autopilot → export DOCX → scorecard and uploads artifacts to Supabase Storage at `artifacts/runs/<runId>/`.
- `/admin` exposes a simple form so you can kick off the flow without crafting requests manually.

### RFP attachments fetcher
- Endpoint: `POST /api/rfp/attachments` with either `{ source: "simpler", simplerId, projectId }` or `{ source: "grants", opportunityId, projectId }`.
- `simpler` downloads attachments (requires `SIMPLER_API_KEY`) and stores them in Supabase Storage under `uploads/rfp/...`, indexing them as `Upload` records with kind `rfp-attachment` plus extracted text for PDF/DOCX.
- `grants` returns the Grants.gov attachment metadata when direct downloads are unavailable.
- `SIMPLER_API_KEY` and `SIMPLER_API_BASE` (optional) configure the Simpler API client; `GRANTS_API_BASE` (optional) points search + metadata calls at a different Grants.gov environment.

### Privacy posture

Project data stays in Postgres with per-project vector stores in OpenAI File Search. Uploaded artifacts are hashed; repeat uploads skip re-processing. Compliance metadata (format limits and tighten results) lives on `section.formatLimits`. We do not send PII to third parties beyond OpenAI (governed by `OPENAI_PROJECT`); encryption at rest comes from the managed Postgres + OpenAI storage layers. Toggle web search per session to avoid hitting public sources when not needed.
