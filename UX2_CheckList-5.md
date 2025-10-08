# UX2_CheckList-5.md — Agents SDK Prototype (No Chat UI)

> **Objective:** Deliver a deployable prototype that runs the full Granted flow via the OpenAI Agents SDK (code-only), exercising file inputs, memory, file search, and session storage while removing ChatKit and UI complexity. Ship directly off `main` with green Vercel deployments.

---

## 0) Baseline hygiene
- [x] Verify `.env.local` contains `DATABASE_URL`, `NEXTAUTH_SECRET`, Google OAuth creds, and the latest OpenAI keys. *(Added placeholder local values; requires running Postgres to connect.)*
- [x] Run `npx prisma migrate dev` locally; run `npx prisma migrate deploy` on Vercel preview before merging. *(Local run succeeded using Homebrew Postgres 15; still need deploy step after push.)*
- [x] Confirm `npm run lint`, `npm run build`, and `npm run verify:ux2` succeed locally. *(Updated Node to v20, fixed legacy component lint issues, and verified build + UX checks.)*
- [x] Remove stale feature flags (`UX2_REV3`, `UX2_REV4`); ensure new behavior is default-on. *(No occurrences found in repo.)*

---

## 1) Environment & configuration
- [x] Replace ChatKit env vars with Agents SDK settings: `AGENTKIT_WORKFLOW_ID`, `AGENTKIT_PROJECT_ID`, `OPENAI_MODEL`, `OPENAI_API_KEY` (no ChatKit secrets). *(Removed ChatKit entries from `web/.env.example`.)*
- [x] Add `AGENTKIT_MEMORY_STORE` (e.g., `postgres`) and `AGENTKIT_FILE_SEARCH=1` to toggle memory/file tools. *(Example + Vercel env updated.)*
- [x] Update `web/.env.example` + infra docs to reflect the streamlined config. *(Adjusted `web/docs/agentkit-setup.md` + `docs/agentkit-notes.md`.)*
- [x] Ensure Vercel project env mirrors local values; record the active secrets in the project runbook. *(Synced via `vercel env add/rm`; runbook now references new vars.)*

---

## 2) Data model & persistence
- [x] Prune unused ChatKit tables/models (`ChatKitSession`, related relations) or mark deprecated in Prisma schema. *(Removed relation from `Project` and dropped the table.)*
- [x] Add minimal `AgentSession` model `{ id, projectId, agentRunId, transcriptJson, createdAt }` for code-driven sessions. *(Introduced `AgentSession` with optional `memoryId`/`updatedAt` fields.)*
- [x] Generate Prisma migration; rerun `npx prisma generate`.
- [x] Update `@/lib/prisma` selectors to reference the new session table. *(Created `lib/agent/sessions.ts` for CRUD helpers.)*

---

## 3) Agents SDK runtime
- [x] Consolidate agent entrypoints around `@openai/agents` `client.agents.sessions`, removing `chat/guide` handler. *(Legacy `/api/chat/guide` deleted; new runtime utilities drive Agents SDK usage.)*
- [x] Implement `lib/agent/runtime.ts` exposing `startSession({ projectId, input })` → returns session id + first reply. *(Provides start/continue helpers backed by Agents sessions with Responses fallback.)*
- [x] Implement `continueSession({ sessionId, messages })` to reuse memory + state. *(Stores transcript via `AgentSession` and reuses `memoryId` when available.)*
- [x] Register actions from `lib/agent/agentkit.ts` with the workflow metadata (use `client.agents.actions.sync`). *(`ensureAgentActionsSynced` syncs JSON schemas on demand.)*
- [x] Ensure `callAgentActionWithAgents` delegates to `client.agents.runs.create` with attached tools instead of bespoke runner. *(Runner now invokes Agents runs API and records external run IDs, falling back to local executor on failure.)*

---

## 4) File ingestion & PDF support
- [x] Replace `/api/autopilot/upload` parser with OpenAI Files API + PDF extraction (`client.files.content.retrieve`) pipeline; persist parsed text. *(Endpoint now uploads via OpenAI Files and uses `responses.parse`/`files.content` fallbacks, storing parsed text + file id.)*
- [x] Hook `registerKnowledgeBaseFile` to upload files to the vector store via the official Agents SDK attachments API. *(Prefers `client.agents.vectorStores.files.create` and reuses existing OpenAI file ids.)*
- [x] Support streamed ingestion from local files + URLs using the File Inputs guide (chunk large PDFs, set `purpose:"assistants"`). *(Form handler accepts multiple `file`/`url` entries and streams buffers with a 40 MB guard.)*
- [x] Emit ingestion events to `AgentSession` for traceability. *(Optional `sessionId` appends a `tool` transcript summary via `updateAgentSession`.)*

---

## 5) Memory & retrieval
- [x] Enable Agents memory (Responses Memory API) scoped to `projectId` and store the returned `memory_id` in `AgentSession`. *(Sessions capture `memoryId` from Agents responses and reuse it on subsequent calls.)*
- [x] Update `runIntake` to pass `memory_id` + `vector_store_id` attachments on every agent run. *(Runner auto-injects vector store + resolved memory ids when invoking actions.)*
- [x] Persist eligibility/conflict updates via agent events; wire to `persistAgentState`. *(Existing event subscribers continue to sync Prisma state on conflict/eligibility emissions.)*
- [x] Backfill existing projects with `memory_id` via migration script (`scripts/migrations/backfill-memory.ts`). *(Adds bootstrap script to seed sessions for legacy projects.)*

---

## 6) API surface (code-first UX)
- [x] Add `/api/agent/session` POST (start) and `/api/agent/session/[id]` POST (continue) endpoints; both return agent replies + tool logs. *(New routes handle message normalization and include recent tool events.)*
- [x] Secure endpoints with NextAuth session check; return 401 when unauthenticated. *(Both handlers require `auth()` and short-circuit on missing user.)*
- [x] Instrument handlers with `withApiInstrumentation` to log request IDs + latency. *(Wrapped base handler or closure for dynamic route.)*
- [x] Update any CLI/demo scripts (`scripts/run-agent-evals.js`) to call the new endpoints. *(Script now performs optional session start/continue demo when `APP_URL` available.)*

---

## 7) Observability & evals
- [ ] Extend `scripts/run-ux2-checks.js` to cover memory persistence + file-search attachment success.
- [ ] Update `run-agent-evals.js` to execute a full session (start → upload → draft) and assert coverage Δ.
- [ ] Store agent run metrics in `AgentWorkflowRun` table; ensure `recordMetric` uses the new session ids.
- [ ] Add Datadog/console logging note in docs describing how to inspect prototype runs.

---

## 8) Cleanup & launch
- [ ] Remove unused Chat UI components (`components/ux2/chat` etc.) or archive under `archive/`.
- [ ] Delete ChatKit npm deps from `package.json`; run `npm install` and confirm lockfile updates.
- [ ] Update README to describe the CLI-driven workflow (no UI) and usage examples (`curl` / `scripts/demo-session.ts`).
- [ ] Trigger Vercel deploy on `main`; confirm `npm run build` passes in CI and preview returns 200 on `/api/agent/session`.
- [ ] Tag release `ux2-prototype-agents-sdk` once green deploy verified.

---

## 9) Documentation follow-up
- [ ] Summarize architecture + API contract in `docs/agents-sdk-prototype.md`.
- [ ] Record open questions (future UI path, extra tools) and backlog them in Notion/Jira.
- [ ] Outline next iteration goals (e.g., reintroduce minimal UI shell, advanced evals) after prototype validation.
