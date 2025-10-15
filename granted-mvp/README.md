# Granted MVP

Conversational workspace for drafting grants with OpenAI's Agents SDK. The app ingests RFPs as PDFs or URLs, tracks coverage, and exports DOCX drafts.

## Getting started

```bash
pnpm install
cp .env.example .env.local # add OPENAI_API_KEY and related secrets
pnpm dev
```

## Core features

- Next.js App Router UI with chat workspace, coverage panel, and source rail
- OpenAI Agents SDK orchestration with File Search and Web Search tools
- Upload PDFs or import URLs directly into a per-session vector store
- Streaming assistant replies with Fix-next suggestions and coverage updates
- DOCX export pipeline using the `docx` package
- Coverage slots surface grounded facts with inline evidence and confidence

## Fact ingestion & coverage

Plan12 adds a deterministic ingestion pass inside `normalizeRfp`:

1. Uploaded sources are attached to a per-project OpenAI vector store.
2. The normalize job calls `file_search` with a targeted fact schema (title, deadline, eligibility, budget caps, etc.).
3. Extracted facts are hashed and stored in `rfp_facts` (with history in `rfp_facts_events`).
4. Coverage slots merge those facts with chat/draft heuristics; evidence now appears inline in the UI with confidence badges.

### How coverage scoring works

Coverage promotes each slot based on grounded facts:

- **Opportunity overview** – needs any 1 medium-confidence fact for partial (title/deadline/portal) and any 2 high-confidence facts for complete.
- **Eligibility & compliance** – completes with a single high-confidence eligibility summary.
- **Project narrative** – partial with either project focus or formatting constraints; complete with a high-confidence focus summary.
- **Organizational capacity** – complete when a high-confidence capacity requirement is found.
- **Key personnel** – partial/complete thresholds mirror capacity (one grounded requirement).
- **Budget & cost share** – partial when either cap or match data appears; complete with a high-confidence cap or match fact.
- **Timeline & milestones**, **Evaluation plan**, **Attachments & appendices** – partial/complete thresholds require one medium/high-confidence grounded fact.

### Environment flags

- `INGEST_FACTS_ENABLED` – defaults to `true` locally; set to `true` in production when ready to roll out.
- `GRANTED_INGEST_MODEL` – optional override for the ingestion Responses model (defaults to `gpt-4.1-mini`).

### Supabase migrations

Run the new migrations before deploying:

```
supabase db push
```

New tables: `rfp_facts`, `rfp_facts_events`.

You can seed a demo fact with `node scripts/seed-rfp-fact.js <session-id>`.

## API routes

- `POST /api/agent` – Streams agent responses as server-sent events
- `POST /api/upload` – Upload PDFs and attach them to the session's vector store
- `POST /api/import-url` – Fetch remote URLs and ingest them as searchable files
- `POST /api/export` – Build and download a DOCX from markdown
- `GET /api/health` – Health check used by Vercel and monitors

## Testing

```bash
pnpm test
```

Vitest covers fact parsers, hash stability, and coverage promotion rules. Tests run in a Node environment with the same `@` aliasing as the app.

## Deployment

1. Push to GitHub and link the repo to Vercel.
2. Configure `OPENAI_API_KEY` (and optional org/project IDs) for Production and Preview.
3. Vercel auto-deploys the `main` branch.

## Versioning note

The workspace scaffold that currently lives in this repository is published as package version `0.1.0` and aligns with the single Plan7 implementation tracked in `Plan7.md`. There are no alternative "version 1", "version 2", or "version 3" variants of the app checked in yet, so `0.1.0` is the only option available today.
