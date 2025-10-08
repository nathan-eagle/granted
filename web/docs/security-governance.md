# Security & Governance Notes

- Upload encryption optional via `ARTIFACT_ENCRYPTION_KEY` (see `lib/artifacts.ts`).
- Event logs redact PII by storing request metadata only.
- Per-upload trust toggles surfaced in the UX2 workspace.
- Connector usage logged through AgentKit event emission hooks (see `lib/agent/events.ts`).
