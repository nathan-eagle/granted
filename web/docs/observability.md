# Observability Cheatsheet (Agents SDK Prototype)

## Metrics & traces
- `AgentWorkflowRun` holds top-level invocations; `result` includes `{ action, fallbackUsed, agentsRunId }`.
- `recordMetric` emits `agent.tool.run` / `agent.tool.complete` events with metadata `{ hasAttachment, agentsRunId, memoryId }`.
- Vector store and file ingestion failures are logged via `registerKnowledgeBaseFile` metadata (`vectorStoreUploadError`).

## Runtime logging
- API routes are wrapped with `withApiInstrumentation`, recording method, path, status, duration, and request id in `EventLog`.
- Use `vercel logs <deployment>` for live debugging, or query `EventLog` filtered by `requestId` from response headers.

## Dashboards / next steps
- Datadog target metrics: coverage delta, tighten success, failed tool invocations (where `status = failed` or `fallbackUsed = true`).
- Future: push `agent.tool.complete` metrics to Datadog via Vercel integrations; add alerts on sustained fallback usage or ingest failures.
