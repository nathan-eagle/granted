Granted (Next.js + Prisma)

Local development
- Copy `.env.example` to `.env.local` and fill values.
- `nvm use 20`
- `npm install`
- `npx prisma migrate dev`
- `npm run dev`

Deploy notes
- Root directory is `web/`.
- Install: `npm ci`
- Build: `npm run build`
- Output: `.next`

### Blueprint mapper
- Endpoint: `POST /api/blueprints/map` with `{ projectId, rfpId, blueprintId }`.
- Admin helper: `/project/:id/map` surfaces a simple form so you can trigger the mapper after ingesting an RFP.
- Maps `Requirement` rows onto blueprint sections (currently NSF SBIR) using OpenAI classification when available and lexical similarity fallback, updating section limits + stored requirements.

### RFP attachments fetcher
- Endpoint: `POST /api/rfp/attachments` with either `{ source: "simpler", simplerId, projectId }` or `{ source: "grants", opportunityId, projectId }`.
- `simpler` downloads attachments (requires `SIMPLER_API_KEY`) and stores them in Supabase Storage under `uploads/rfp/...`, indexing them as `Upload` records with kind `rfp-attachment` plus extracted text for PDF/DOCX.
- `grants` returns the Grants.gov attachment metadata when direct downloads are unavailable.
- `SIMPLER_API_KEY` and `SIMPLER_API_BASE` (optional) configure the Simpler API client; `GRANTS_API_BASE` (optional) points search + metadata calls at a different Grants.gov environment.
