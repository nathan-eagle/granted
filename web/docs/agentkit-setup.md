# AgentKit Setup Checklist

- AgentKit project: `granted-ux4` (org: GrantedAI) with retention set to 30 days (confirm in OpenAI dashboard under **Settings → Data retention** once created).
- Workflow ID (`AGENTKIT_WORKFLOW_ID`): `wf_68e537c4e69881908e65357e36a28f3c08492e7f3aee14b4` (Rev‑4 stub published 2025‑10‑07). Reuse as `CHATKIT_WORKFLOW_ID` until a dedicated ChatKit workspace is provisioned.
- Tools registered: `ingest_rfp_bundle`, `normalize_rfp`, `mine_facts`, `score_coverage`, `draft_section`, `tighten_section`, `export_docx`.
- Data retention + logging approved in OpenAI dashboard (2025-10-05). Re-validate for Rev‑4 and capture screenshots in `docs/agentkit-notes.md` once enabled.
- Connector Registry: enable File Search, Web, Dropbox, Google Drive; restrict to GrantedAI workspace. Document connector approvals in 1Password entry `AgentKit / Granted Rev4`.
- Secrets storage: store the following in 1Password vault `GrantedAI / Engineering` and sync to Vercel + local `.env`:
  - `OPENAI_API_KEY` (shared across AgentKit + ChatKit)
  - `AGENTKIT_PROJECT_ID`
  - `AGENTKIT_WORKFLOW_ID`
  - `CHATKIT_WORKFLOW_ID`
  - `CHATKIT_CLIENT_TOKEN_SHARED_SECRET`
- Local `.env` templates updated in `web/.env.example`; Vercel dashboard must mirror these keys on the `granted` project under Production + Preview environments.
- Health check: run `npm run agentkit:check` (with `AGENTKIT_CHECK_SKIP_NETWORK=1` until AgentKit project endpoint is GA). Once API available, remove the skip flag and expect HTTP 200.
- File/OCR toolchain available: `pdf-parse` (OCR fallback via `mammoth`), HTML readability handled by `fetch` + DOM parsing in intake pipeline.
