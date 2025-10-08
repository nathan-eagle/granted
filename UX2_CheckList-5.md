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
- [ ] Prune unused ChatKit tables/models (`ChatKitSession`, related relations) or mark deprecated in Prisma schema.
- [ ] Add minimal `AgentSession` model `{ id, projectId, agentRunId, transcriptJson, createdAt }` for code-driven sessions.
- [ ] Generate Prisma migration; rerun `npx prisma generate`.
- [ ] Update `@/lib/prisma` selectors to reference the new session table.

---

## 3) Agents SDK runtime
- [ ] Consolidate agent entrypoints around `@openai/agents` `client.agents.sessions`, removing `chat/guide` handler.
- [ ] Implement `lib/agent/runtime.ts` exposing `startSession({ projectId, input })` → returns session id + first reply.
- [ ] Implement `continueSession({ sessionId, messages })` to reuse memory + state.
- [ ] Register actions from `lib/agent/agentkit.ts` with the workflow metadata (use `client.agents.actions.sync`).
- [ ] Ensure `callAgentActionWithAgents` delegates to `client.agents.runs.create` with attached tools instead of bespoke runner.

---

## 4) File ingestion & PDF support
- [ ] Replace `/api/autopilot/upload` parser with OpenAI Files API + PDF extraction (`client.files.content.retrieve`) pipeline; persist parsed text.
- [ ] Hook `registerKnowledgeBaseFile` to upload files to the vector store via the official Agents SDK attachments API.
- [ ] Support streamed ingestion from local files + URLs using the File Inputs guide (chunk large PDFs, set `purpose:"assistants"`).
- [ ] Emit ingestion events to `AgentSession` for traceability.

---

## 5) Memory & retrieval
- [ ] Enable Agents memory (Responses Memory API) scoped to `projectId` and store the returned `memory_id` in `AgentSession`.
- [ ] Update `runIntake` to pass `memory_id` + `vector_store_id` attachments on every agent run.
- [ ] Persist eligibility/conflict updates via agent events; wire to `persistAgentState`.
- [ ] Backfill existing projects with `memory_id` via migration script (`scripts/migrations/backfill-memory.ts`).

---

## 6) API surface (code-first UX)
- [ ] Add `/api/agent/session` POST (start) and `/api/agent/session/[id]` POST (continue) endpoints; both return agent replies + tool logs.
- [ ] Secure endpoints with NextAuth session check; return 401 when unauthenticated.
- [ ] Instrument handlers with `withApiInstrumentation` to log request IDs + latency.
- [ ] Update any CLI/demo scripts (`scripts/run-agent-evals.js`) to call the new endpoints.

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
