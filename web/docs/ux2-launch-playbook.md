# UX2 Launch Playbook

1. Promote the Agents SDK prototype to 100% of traffic (feature flag retired) and monitor `coverage.delta`, `tighten.applied`, and `/api/agent/session` volume via event logs.
2. Publish help article "How to work with the Granted API" (CLI + cURL examples mirrored from the workspace instructions).
3. Gather feedback through the in-product link (footer mailto) and maintain a shared doc for quick wins / regressions.
4. Support playbook now focuses on API troubleshooting, file ingestion (Files API parsing/OCR fallback), and conflict resolution workflow.
5. Eligibility overrides surface in the left rail; confirm `/api/eligibility/override` writes back to AgentKit memory and advise teams to log override rationale in comments.
6. Fix-next suggestions are returned with coverage metadata; support should remind teams that follow-up actions may take a few seconds if an agent run is already in progress (409 response).
