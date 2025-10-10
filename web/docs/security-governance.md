# Security & Governance Notes

- Upload encryption optional via `ARTIFACT_ENCRYPTION_KEY` (see `lib/artifacts.ts`).
- Event logs redact PII by storing request metadata only.
- Per-upload trust toggles surfaced in the UX2 workspace.
- Connector usage logged through AgentKit event emission hooks (see `lib/agent/events.ts`).
- AgentKit connectors configured for Rev‑4:
  - `AGENTKIT_CONNECTOR_FILE_PDF` (PDF bundle ingestion, us-east-1, quota 10k pages/month)
  - `AGENTKIT_CONNECTOR_FILE_OCR` (scanned/OCR intake, us-east-1, quota 4k pages/month)
  - `AGENTKIT_CONNECTOR_FILE_HTML` (HTML/URL ingestion, us-east-1, quota 6k requests/month)
  - `AGENTKIT_CONNECTOR_FILE_SEARCH` (file search grounding, us-east-1)
  All connectors share 30-day default retention and emit audit entries to the AgentKit registry; IDs stored in Prisma under `AgentKnowledgeBase` / `AgentKnowledgeBaseFile` metadata for replay.
- Vector store provisioning uses OpenAI managed stores (`AgentKnowledgeBase.vectorStoreId`). Upload/file bindings persisted for auditing; remote uploads can be disabled locally with `AGENTKIT_VECTOR_DISABLE_REMOTE=1`.
- DOCX exports now flow through the AgentKit `export_docx` action; `/api/export/docx` streams the hosted file and inherits AgentKit retention/SAS policies.
