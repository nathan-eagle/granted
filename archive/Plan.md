Awesome—thanks for the crisp choices. Based on your answers, here’s a pragmatic, step‑by‑step execution plan you can hand to an AI (or a contractor) to build an SBIR/STTR Autopilot in your new repo. It’s split into small, shippable chunks, each with scope, rationale, tasks, acceptance criteria, and test notes. It prioritizes time‑to‑first‑draft over bells and whistles, assumes ~10 concurrent users, and keeps the stack simple.

---

## Guiding principles (keep these visible in the repo README)

* North star: minimize time to first complete draft after user presses Autodraft.
* Audience: non‑technical founders; Guided Assistant UI; low cognitive load.
* Programs: SBIR/STTR; launch with NSF SBIR Phase I, add one more pack in v1.1.
* Mode: Autopilot first; the app asks only when it truly must.
* Simplicity: fewer moving parts > enterprise features. JSON over heavy orchestration.
* Traceability: every paragraph should point to (a) an RFP requirement and/or (b) a fact.
* Safety: never silently delete required content when tightening to limits.

Stack (opinionated, minimal):

* Next.js 14 (App Router), TypeScript, Vercel
* UI: basic server-rendered pages first; add shadcn/ui + TipTap later
* DB: Postgres (Supabase/Neon) + Prisma (start with JSON columns)
* Storage: Vercel Blob (later) — start with DB text cache
* LLM: OpenAI (JSON mode); background jobs per section when needed
* Telemetry: tiny event logger in Postgres; add PostHog later

---

# Roadmap (6 small sprints)

Each sprint is 1–2 days of focused work. Ship at the end of each sprint.

Progress checklist
- [x] Sprint 0 — Repo, deploy, and “Hello, Autopilot” (placeholder sections, draft workspace)
- [x] Sprint 1 — Agency pack + Six‑question intake + Real autodraft (OpenAI JSON → Sections)
- [x] Sprint 2 — Uploads (.txt/.md) + Fact miner + basic append facts
- [x] Sprint 3 — Coverage scoring + Fix next + Tighten to limits
- [x] Sprint 4 — Mock review → Fix‑list (apply individual patches)
- [x] Sprint 5 — Basic budget + DOCX export + second agency pack (NIH)
- [ ] Sprint 2 polish — richer facts UI (evidence snippet, per‑fact source)
- [ ] Sprint 4 polish — Apply all safe fixes; impact ordering by rubric weights
- [ ] Editor polish — editable textareas with Save/Autosave

## Sprint 0 — Repo, deploy, and “Hello, Autopilot”

Goal: Have a running app on Vercel with auth, DB, and a placeholder Autodraft that creates sections.

Scope
- Project create page with CTA: Autowrite my SBIR.
- Minimal tables: Project (extended), Section, Upload.

Tasks
1) DB schema v0: extend Project and add Section/Upload (see schema in the README and repo).
2) Pages: `/new` intake shell (pick agency pack) → creates Project and routes to `/project/[id]/draft`.
3) Placeholder Autopilot: server action that inserts 3 placeholder sections.

Acceptance
- Can sign in, create a project, click Autodraft, see 3 placeholder sections.

## Sprint 1 — Agency pack + Six‑question intake + Real autodraft

Goal: Deliver a first complete draft from an agency pack + minimal intake.

Scope
- NSF SBIR Phase I agency pack JSON.
- Six‑question intake.
- autodraft skill: single LLM call returns JSON for all sections and saves to DB.

Acceptance
- Clicking Autodraft yields all pack sections with coherent Markdown; `[MISSING: …]` tags appear for gaps; completion % reflects coverage.

## Sprint 2 — Uploads + Fact miner + Drag‑to‑insert

Goal: Let users drop prior proposals/boilerplate; mine facts; insert them with citations.

Scope
- Upload multiple docs; extract text into DB.
- `mine_facts` skill to produce a facts ledger; drag‑to‑insert facts.

## Sprint 3 — Coverage scoring + Gaps + “Fix next” + Tighten

Goal: Make the draft measurable and fixable with one button.

Scope
- Coverage metrics and word counts.
- `fill_gap` and `tighten` skills.

## Sprint 4 — Mock review → prioritized Fix‑list (+ 1‑click patches)

Goal: Produce a single prioritized fix‑list that users can apply with one click.

## Sprint 5 — Basic budget + DOCX export + second agency pack

Goal: Spreadsheet‑lite budget, DOCX export (no Google verification), and add a second pack.

---

# Implementation details

API/server actions (minimal)
- POST /api/project → create project
- POST /api/autodraft?projectId → calls LLM; writes Section rows
- POST /api/facts?projectId → runs miner (later)
- POST /api/fill-gap, /api/tighten, /api/mock-review (later)
- GET /api/export/docx?projectId (later)

Editor mechanics
- Markdown textarea with small toolbar later; autosave on blur.

Prompts (concise) and coverage heuristics are included in the README for reference.

Telemetry
- Record t0/t1/t2 in Project.meta; show time‑to‑first‑draft in admin later.

Backlog (post‑MVP)
- Strict formatting preview, collaboration, connectors, improved coverage signals.
