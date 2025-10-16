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

## Fact discovery, ingestion & coverage

Plan15 replaces the static coverage template with an RFP-as-schema pipeline:

1. Uploaded sources are attached to a per-project OpenAI vector store.
2. `discoverDoD` runs a file-search-only pass that emits the solicitation-specific checklist (sections, slots, constraints, conditional items).
3. For each `must` / `should` slot we call the Responses API with `tool_choice:"required"` to extract grounded facts (and we skip inserts when citations are missing).
4. Facts are hashed and stored in `rfp_facts` (`rfp_facts_events` keeps history). Coverage now renders the discovered sections with Verified/Unverified badges, conditional N/A toggles, and weighted scoring (must = 1.0, should = 0.5).

### Coverage scoring

- Sections are **complete** when all applicable `must` slots (or `conditional` slots marked N/A) are satisfied with cited facts.
- **Partial** sections have at least one satisfied slot but still need evidence or additional detail.
- The overall score is a weighted fill rate (`must` = 1.0, `should` = 0.5) and is persisted with the DoD version used to compute it.

### Environment flags

- `INGEST_FACTS_ENABLED` – defaults to `true` locally; set to `true` in production when ready to roll out.
- `GRANTED_DISCOVER_MODEL` – optional override for the discovery Responses model (defaults to `gpt-4.1-mini`).
- `GRANTED_INGEST_MODEL` – optional override for the ingestion Responses model (defaults to `gpt-4.1-mini`).
- `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` – required for the `/api/logs/[deploymentId]` endpoint to call the Vercel Logs API.

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
- `GET /api/logs/[deploymentId]` – Fetch runtime logs for a Vercel deployment (requires auth + Vercel token envs)
- `POST /api/coverage/na` – Toggle a discovered slot as Not Applicable and refresh coverage
- `POST /api/export` – Build and download a DOCX from markdown
- `GET /api/health` – Health check used by Vercel and monitors


## Debug scripts

- `pnpm tsx scripts/debug-extract.ts --session <session-id> [--slot <slotId|all>] [--dry-run]` — inspect what the discovered DoD extractor would insert, without mutating the database when `--dry-run` is supplied.

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
