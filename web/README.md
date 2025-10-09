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
- `POST /api/agent/session` → start a session (`{ projectId, messages[] }`) and receive `{ sessionId, reply, memoryId, logs[] }`.
- `POST /api/agent/session/{sessionId}` → continue a session with additional messages and retrieve the updated transcript + logs.
- `POST /api/autopilot/upload` → upload local files or URLs. Supports multipart `file`/`url` entries, registers OpenAI Files, and appends optional `sessionId` events.
- Smoke tests: `npm run verify:ux2` exercises deterministic checks and optionally calls the API when `APP_URL` is set.

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
