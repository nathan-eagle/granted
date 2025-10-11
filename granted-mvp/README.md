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

## API routes

- `POST /api/agent` – Streams agent responses as server-sent events
- `POST /api/upload` – Upload PDFs and attach them to the session's vector store
- `POST /api/import-url` – Fetch remote URLs and ingest them as searchable files
- `POST /api/export` – Build and download a DOCX from markdown
- `GET /api/health` – Health check used by Vercel and monitors

## Deployment

1. Push to GitHub and link the repo to Vercel.
2. Configure `OPENAI_API_KEY` (and optional org/project IDs) for Production and Preview.
3. Vercel auto-deploys the `main` branch.

## Versioning note

The workspace scaffold that currently lives in this repository is published as package version `0.1.0` and aligns with the single Plan7 implementation tracked in `Plan7.md`. There are no alternative "version 1", "version 2", or "version 3" variants of the app checked in yet, so `0.1.0` is the only option available today.
