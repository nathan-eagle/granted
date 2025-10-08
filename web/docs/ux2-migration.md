# UX2 Rev4 Migration Plan — AgentKit/ChatKit State

_Last updated: 2025-10-07T17:55Z_

## Summary
- Replace legacy project-level JSON blobs (`rfpNormJson`, `factsJson`, `coverageJson`, `conflictLogJson`, `eligibilityJson`) with AgentKit-managed state and explicit history tables.
- Introduce persistent audit/event tables for AgentKit workflow runs and ChatKit sessions so we can replay state, debug issues, and hydrate the UI without bespoke JSON payloads.
- Backfill legacy data into the new tables, then remove redundant columns once verification is complete.

## Target schema changes
1. **Project table cleanup**
   - Deprecate `rfpNormJson`, `factsJson`, `coverageJson`, `conflictLogJson`, `eligibilityJson` (retain temporarily behind feature flag).
2. **Agent workflow run history**
   - Table `AgentWorkflowRun`:
     - `id` (cuid) — primary key.
     - `workflowId` (string) — OpenAI workflow identifier (e.g., `wf_...`).
     - `projectId` (string, nullable) — link to `Project`.
     - `status` (enum/text) — `pending|running|succeeded|failed|canceled`.
     - `input` (jsonb) — normalized payload submitted to the runner.
     - `result` (jsonb) — final toolkit output / coverage summary.
     - `error` (text) — failure message if any.
     - `startedAt`, `completedAt` (timestamps).
   - Table `AgentWorkflowRunEvent`:
     - `id` (cuid).
     - `runId` FK to `AgentWorkflowRun`.
     - `type` (string) — e.g., `tool.invocation`, `tool.result`, `coverage.delta`.
     - `payload` (jsonb).
     - `createdAt`.
     - Index on `(runId, createdAt)`.
3. **Agent sessions**
   - Table `AgentSession`:
     - `id` (cuid).
     - `projectId` FK (required).
     - `agentRunId` (string, nullable).
     - `memoryId` (string, nullable).
     - `transcriptJson` (jsonb) — array entries `{ role, content, at }`.
     - `createdAt`, `updatedAt`.

## Backfill strategy
- For existing projects:
  1. Snapshot current JSON fields and write them into `AgentWorkflowRun` records with synthetic run IDs (`legacy_snapshot` type) to preserve history.
  2. Generate `AgentWorkflowRunEvent` entries for conflicts/eligibility items so the UI has a contiguous event timeline.
  3. For Rev5, create `AgentSession` rows for active users (if applicable) with metadata referencing the legacy `Project.meta.chat` field.

## Migration steps
1. Generate Prisma migration `agentkit_state_refactor` introducing new tables and keeping legacy columns.
2. Write `scripts/migrations/backfill-agentkit-state.ts` to copy JSON columns into the new tables.
3. Run the backfill script locally, verify counts, and capture queries in this doc.
4. Remove writes to legacy columns in runtime code (ensure guard behind feature flag).
5. In a follow-up migration, drop the redundant columns once production backfill is confirmed.

## Rollback plan
- If deployment fails post-migration, re-seed legacy columns from the new tables (reverse backfill script).
- Keep migration idempotent: re-running should not duplicate rows (use upserts keyed by project + workflow + snapshot timestamp).
- Maintain feature flag to disable AgentKit-backed reads and fall back to legacy JSON until confidence is high.

## Verification
- `npm run verify:ux2` + Playwright smoke tests (ensure coverage/conflict/eligibility panels render).
- Manual regression: ingest multi-doc RFP and confirm events appear via `AgentWorkflowRunEvent` query.
- Auditing queries (run in staging/prod):
  ```sql
  SELECT project_id, count(*) FROM "AgentWorkflowRun" WHERE status = 'succeeded' GROUP BY 1 ORDER BY 2 DESC;
  SELECT run_id, type, created_at FROM "AgentWorkflowRunEvent" WHERE run_id = '<runId>' ORDER BY created_at;
  ```

## Next actions
- Author Prisma migration + backfill script.
- Update runtime (orchestrator, API routes) to read/write via new tables.
- Monitor staging rollout, then drop legacy columns when stable.
