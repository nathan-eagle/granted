# AgentKit Setup Checklist

- AgentKit project: `granted-ux2` (org: GrantedAI) with retention set to 30 days.
- Tools registered: `ingest_rfp_bundle`, `normalize_rfp`, `mine_facts`, `score_coverage`, `draft_section`, `tighten_section`, `export_docx`.
- Data retention + logging approved in OpenAI dashboard (2025-10-05).
- File/OCR toolchain available: `pdf-parse` (OCR fallback via `mammoth`), HTML readability handled by `fetch` + DOM parsing in intake pipeline.
