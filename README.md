# Granted — SBIR/STTR Autopilot (v1)

Goal: minimize time to first complete draft after the user presses **Autodraft**.

## Guiding Principles

- Autopilot first: ask only when truly necessary; proceed with safe assumptions.
- Audience: non‑technical founders; low‑friction, guided assistant UI.
- Start narrow: launch with NSF SBIR Phase I; add other packs iteratively.
- Simplicity: JSON contracts over complex orchestration; few moving parts.
- Traceability: paragraphs map to RFP requirements and/or facts.
- Safety: tightening must never delete required content.

## Tech Stack

- Next.js 14 (App Router), TypeScript, Vercel
- DB: Postgres (Supabase/Neon) + Prisma (JSON columns to start)
- LLM: OpenAI (JSON mode); background jobs per section if needed
- Storage: start with DB text cache; add Vercel Blob later

## Roadmap (Sprints)

See PLAN.md for full details. Summary:

1. Sprint 0 — Repo, deploy, and “Hello, Autopilot”
2. Sprint 1 — Agency pack + Six‑question intake + Real autodraft
3. Sprint 2 — Uploads + Fact miner + Drag‑to‑insert
4. Sprint 3 — Coverage scoring + Gaps + “Fix next” + Tighten
5. Sprint 4 — Mock review → Fix‑list (+ 1‑click patches)
6. Sprint 5 — Basic budget + DOCX export + second agency pack

## New Experience Plan

See PLAN2.md for the “premium experience” plan (M1–M6) covering the cinematic onboarding, Magic Overlay, polished workspace, beautiful facts, safe tightening, and elegant DOCX.

## Data Model (initial)

We extend `Project` and add `Section`, `Upload`, and later `Review`.

```prisma
model Project {
  id           String   @id @default(cuid())
  userId       String
  name         String
  createdAt    DateTime @default(now())
  // Autopilot-specific
  agencyPackId String?
  status       String?  // intake | drafting | review | done
  charterJson  Json?
  factsJson    Json?
  meta         Json?

  sections     Section[]
}

model Section {
  id         String   @id @default(cuid())
  projectId  String
  key        String
  title      String
  order      Int
  contentMd  String   @default("")
  slotsJson  Json?
  coverage   Json?
  Project    Project  @relation(fields: [projectId], references: [id])
}

model Upload {
  id         String   @id @default(cuid())
  projectId  String
  kind       String
  filename   String
  url        String?
  text       String?
  Project    Project  @relation(fields: [projectId], references: [id])
}
```

## API Contracts (initial)

- `POST /api/autopilot/create-project` → `{ agencyPackId }` → `{ projectId }`
- `POST /api/autopilot/autodraft` → `{ projectId }` → creates placeholder sections (Sprint 0), real sections (Sprint 1)

## Local Development

- Copy `web/.env.example` to `web/.env.local` and fill in secrets.
- `nvm use 20`
- `cd web && npm install`
- `npx prisma migrate dev`
- `npm run dev`

## Deploy

- Push to `main`. Vercel auto‑deploys Production.
- Build runs `prisma migrate deploy` to keep DB in sync.

## Hands‑Free Iteration Flow (for AI agents)

Goal: implement a task, push, wait ~60 seconds, verify Vercel is green, then immediately continue to the next task without asking for confirmation.

- Token and IDs
  - The Vercel API token is stored in `web/.env.local` as `VERCEL_TOKEN=...`.
  - Project/Org IDs are in `web/.vercel/project.json` (`projectId`, `orgId`).

- Push changes
  - `git add -A && git commit -m "<short message>" && git push origin HEAD`

- Check deploy status (poll up to ~60s)
  - Get latest deployment for the project:
    - `curl -s -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v6/deployments?projectId=<PROJECT_ID>&teamId=<ORG_ID>&limit=1"`
  - Inspect `readyState`:
    - `READY` → green; proceed to next task.
    - `ERROR`/`FAILED` → fetch build events for details:
      - `curl -s -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v2/deployments/<DEPLOYMENT_UID>/events?teamId=<ORG_ID>&limit=300"`
      - Fix the root cause, push again, and re‑check.

- Example bash snippet
```
TOKEN=$(sed -n 's/^VERCEL_TOKEN="\(.*\)"/\1/p' web/.env.local)
PROJ=$(jq -r .projectId web/.vercel/project.json)
TEAM=$(jq -r .orgId web/.vercel/project.json)
for i in {1..30}; do
  sleep 2
  curl -s -H "Authorization: Bearer $TOKEN" \
    "https://api.vercel.com/v6/deployments?projectId=$PROJ&teamId=$TEAM&limit=1" \
    -o /tmp/deploy.json
  STATE=$(node -e 'const d=require("fs").readFileSync("/tmp/deploy.json","utf8"); const x=JSON.parse(d).deployments?.[0]||{}; console.log((x.readyState||x.state||"?"), x.url||"")')
  echo "$STATE" | grep -Eq "READY|ERROR|FAILED" && break
done
```

- Rules of engagement
  - Do not pause for manual confirmation between tasks.
  - If deploy is green: immediately start the next item in Plan4/Plan5.
  - If deploy fails: fetch logs, fix the root cause, push again, re‑check.
  - Prefer small, iterative commits; keep the app running at all times.


## Measuring Success

- Log `t1` (Autodraft click) and `t2` (first complete draft) in `Project.meta`.
- Primary metric: `t2 − t1`.

---

See PLAN.md for step‑by‑step sprint tasks and acceptance criteria.

### Data & Storage
- Database: Prisma -> Supabase Postgres (`DATABASE_URL`)
- File storage: Supabase Storage bucket `uploads`
- AI: OpenAI Responses API (default `OPENAI_MODEL=gpt-5-mini`)


### Supabase (storage + Postgres)
Set these in `web/.env.local`:
```
DATABASE_URL=postgresql://...  # Supabase Postgres connection
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_ANON_KEY=...
```
Create a bucket named `uploads` (public) in Supabase Storage.

### Importing NSF prompts from CSV
Export your Google Sheet as CSV with columns: `key,title,targetWords,promptTemplate`, then run:

```bash
node web/scripts/import_prompts_from_csv.mjs prompts.csv > web/lib/blueprints/nsf_sbir.ts
```

Commit the updated blueprint and re-run the **Apply NSF SBIR** action.
