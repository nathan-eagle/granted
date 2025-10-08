# Agents SDK Prototype Overview

_Last updated: 2025-10-08_

## Architecture snapshot
- **API-first flow.** Frontend surfaces project state and instructions; all agent interactions occur via HTTP endpoints backed by the OpenAI Agents SDK.
- **Sessions.** `/api/agent/session` starts a transcript, `/api/agent/session/{id}` continues it. Each call persists messages, tool logs, and the latest `memoryId` in `AgentSession`.
- **Tools.** Agent actions (`ingest_rfp_bundle`, `normalize_rfp`, `draft_section`, etc.) are registered via `ensureAgentActionsSynced` and executed through `client.agents.runs.create`, with fallback to local executors.
- **Files & retrieval.** `/api/autopilot/upload` streams files/URLs to OpenAI Files, stores parsed text + `openAiFileId`, and mirrors content into vector stores via `registerKnowledgeBaseFile`. Vector store ids hydrate agent runs for file search grounding.
- **Observability.** `AgentWorkflowRun` + `AgentWorkflowRunEvent` capture tool results/errors/fallbacks, including external run ids and attachment/memory metadata for debugging.

## Key endpoints
```http
POST /api/agent/session
POST /api/agent/session/{sessionId}
POST /api/autopilot/upload
POST /api/eligibility/override
POST /api/autopilot/suggestion
```

_All endpoints require a NextAuth session; unauthenticated requests return HTTP 401._

## Typical flow
1. Upload RFP materials via `/api/autopilot/upload` (optional `sessionId` to drop a `tool` event into the transcript).
2. Start a session with `/api/agent/session` providing a system prompt and the first user message.
3. Continue the session as needed with `/api/agent/session/{id}`; responses include coverage suggestions and tool logs for observability dashboards.
4. Use `/api/autopilot/suggestion` or `/api/eligibility/override` for targeted adjustments; coverage panels update automatically on page reload.

## Open questions / backlog
- Should we expose a streaming Responses endpoint for long-running tool output, or keep polling the tool log table?
- Do we need automatic session expiry / cleanup of dormant transcripts?
- Should uploads optionally bypass vector stores for customers without remote storage permissions?

## Next iteration ideas
1. Reintroduce a minimal chat surface that simply mirrors API calls (no ChatKit deps) for teams that prefer UI scaffolding during demos.
2. Add automated regression tests that invoke the Agents SDK in a mocked environment to validate tool wiring end-to-end.
3. Expand observability to push metrics to Datadog (coverage delta, ingestion latency, tool fallback counts) and auto-open incidents when thresholds breach.
