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

## Measuring Success

- Log `t1` (Autodraft click) and `t2` (first complete draft) in `Project.meta`.
- Primary metric: `t2 − t1`.

---

See PLAN.md for step‑by‑step sprint tasks and acceptance criteria.
