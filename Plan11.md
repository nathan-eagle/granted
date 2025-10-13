# Plan11.md — Granted MVP (final)
# Focus: keep it simple, make it work, no second-guessing the user

> **Principle:** The agent should never ask the user what to do next. It should auto-draft, surface a single “Fix next” ask, and keep drafting in the background until a first pass is ready.

This plan assumes **Vercel** hosting with **Next.js/React** UI, **OpenAI Agents SDK** for orchestration, **Supabase** for auth + persistence, and **DOCX export**. It is written so an AI agent can implement each step independently and land a working MVP.

---

## 0) What changed since the last plan

- ✅ **Bug #2 (duplicate URL entries)** — treated as **resolved** per latest reports. Keep the dedupe guardrails below but do not spend time re-fixing.
- ✅ **Bug #5 (drag-and-drop PDF)** — treated as **resolved**. Leave the input affordance in place; verify via smoke test only.
- 🚫 **Assistant messages still vanish on reload** — **NOT** solved: persistence for assistant turns is not implemented. Fix below.
- 🚫 **“Draft generation failed”** — occurs because the button isn’t gated on prerequisites and tool stubs can’t fail gracefully. Fix below.
- 🚫 **Asking user what to do** — the system prompt/logic is permissive; the agent asks questions it should infer. Replace with “Autodraft + Fix next” loop.
- 🚫 **No background drafting** — add a lightweight “auto-runner” so the user can chat while sections draft in the background.

---

## 1) Environment & wiring (Vercel + Supabase + OpenAI)

**Checklist**
- [x] Create a new Supabase project (or reuse an existing one). Note `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
- [x] In Vercel project settings → Environment variables, add:
  - `OPENAI_API_KEY` (required)
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (for client)
  - `NEXT_PUBLIC_APP_NAME=Granted`
- [x] Confirm Edge not required; keep runtime as Node.js for Agents SDK tool calls.
- [x] Deploy preview, verify `/api/health` returns `{ ok: true }`.

---

## 2) Minimal database schema (Supabase)

> Enough to persist users, projects, sessions, messages, sources, coverage snapshots, section drafts, and jobs used by the background auto-runner.

**SQL (run in Supabase SQL editor)**

```sql
-- Users (auth handled by Supabase; mirror minimal profile)
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  created_at timestamp with time zone default now()
);

-- Projects
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles (id) on delete cascade,
  name text not null default 'Untitled project',
  created_at timestamp with time zone default now()
);

-- Sessions (one active workspace per browser tab; belongs to a project)
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects (id) on delete cascade,
  agent_thread_id text, -- OpenAI Agents/Threads id (for background runs)
  created_at timestamp with time zone default now()
);

-- Sources (files or URLs attached to a session)
create type source_kind as enum ('file','url');
create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions (id) on delete cascade,
  label text not null,
  href text,           -- present for URLs
  openai_file_id text, -- present for files
  kind source_kind not null,
  content_hash text,   -- for dedupe
  created_at timestamp with time zone default now(),
  unique (session_id, coalesce(href, openai_file_id)) -- dedupe guard
);

-- Messages (persist full chat, both roles)
create type msg_role as enum ('user','assistant','system');
create table if not exists messages (
  id bigserial primary key,
  session_id uuid references sessions (id) on delete cascade,
  role msg_role not null,
  content text not null,
  run_id text,          -- Agents SDK run id, if from background runner
  created_at timestamp with time zone default now()
);
create index on messages (session_id, created_at);

-- Coverage snapshots
create table if not exists coverage_snapshots (
  id bigserial primary key,
  session_id uuid references sessions (id) on delete cascade,
  score numeric,
  summary text,
  slots jsonb not null,
  created_at timestamp with time zone default now()
);

-- Section drafts (one per canonical section id)
create type section_status as enum ('missing','partial','complete');
create table if not exists section_drafts (
  id bigserial primary key,
  session_id uuid references sessions (id) on delete cascade,
  section_id text not null,
  status section_status not null default 'missing',
  markdown text,
  updated_at timestamp with time zone default now(),
  unique (session_id, section_id)
);

-- Jobs: background auto-runner work items (state machine)
create type job_status as enum ('queued','running','done','error','canceled');
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions (id) on delete cascade,
  kind text not null,             -- e.g., 'autodraft','draft_section','tighten'
  payload jsonb not null default '{}'::jsonb,
  status job_status not null default 'queued',
  result jsonb,
  error text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
create index on jobs (session_id, status, created_at);
```

**Row-Level Security**
Enable RLS and add policies so each user reads/writes only their rows (by `owner_id` → `project_id` → `session_id`).

---

## 3) Auth & session model (simple and robust)

**Goals**
- Email link sign-in (Supabase magic link).
- “Create new grant” or pick an existing one.
- Stable session across hard reload; assistant messages and coverage must reload from DB.

**Steps**
- [x] Install Supabase JS client and wire `createClient()` for client + server.
- [x] Add a top-right **Sign in** form with email. On success, show user avatar/email.
- [x] On new visit: create a **project** (if none) and a **session** bound to that project. Store the session id in the URL (`?s=uuid`) and in a durable cookie.
- [x] On reload: fetch `session_id` from URL/cookie → query `messages`, `coverage_snapshots` (latest), `section_drafts`, and `sources` → hydrate UI.
- [x] Add a simple **Project Switcher** (dropdown) listing user’s projects; “New project” creates new `projects` row and resets `sessions` + UI.

---

## 4) Autodraft-first behavior (no asking the user what to do)

**The loop**
1. When an RFP URL/PDF is added or the user shares org URL and project idea, enqueue a single **autodraft** job.
2. The **auto-runner** (see §6) executes:
   - Normalize RFP → coverage baseline
   - Compute **Fix next** (first unresolved slot with highest value)
   - Draft that section → persist to `section_drafts` with status `partial` or `complete`
   - Recompute coverage → enqueue next job if the budget for the run isn’t exhausted
3. Every material update (coverage change, new draft) posts an **assistant message** (“Drafted Opportunity overview…”, “Next: Eligibility & compliance — need SAM/UEI status”).
4. The **composer** remains usable. The user may chat while the runner continues. The runner never blocks the UI.

**UX changes**
- Replace “What should we draft?” prompts with a non‑dismissible **status chip**:
  - “Autodrafting… drafting 3 sections (tap to pause)”
  - “Paused — 2 questions need answers (SAM/UEI; PI employment)”
- The assistant never asks “Should I…?”. It does, then asks for only the single missing fact to finish a section.

---

## 5) Coverage panel → Section workspace

**Interactions**
- Clicking a coverage slot opens a **Section workspace** pane:
  - Top: status (Missing/Partial/Complete) + progress bar
  - Middle: **Draft editor** (markdown) with **Provenance chips** (e.g., `[RFP]`, `[ORG]`, `[BIO:Jane]`)
  - Right: **Outstanding items** (ordered list of facts needed) with quick‑answer inputs/chips
- “Generate draft” button only appears when prerequisites exist; otherwise it shows “Answer these first: …”

**Prerequisite examples** (hard‑code v1; later learnable):
- *Opportunity overview* → needs `{ solicitation_title, deadlines[], submission_portal }`
- *Eligibility & compliance* → needs `{ applicant_type, SAM_status, UEI, PI_employment_ratio }`
- *Budget & cost share* → needs `{ period_months, labor_roles[], indirect_rate }`

---

## 6) Background auto‑runner (works on Vercel without servers)

> We’ll use a “poor‑man’s queue” with Supabase + a stateless tick endpoint. This keeps complexity low and works on Vercel today.

**API**
- `POST /api/jobs/enqueue` — enqueue `{ kind, payload }` for `session_id`
- `POST /api/jobs/tick` — claim one queued job for the session, run it, update DB, emit assistant message(s), and enqueue follow‑up work if needed. Returns updated coverage + section list.

**Client behavior**
- After any material event (upload URL/PDF, add org URL, paste idea), enqueue `autodraft` once.
- Start a **short polling loop** (e.g., every 4s) calling `/api/jobs/tick?s=<session_id>` until the queue is empty.
- Polling is non‑blocking; the chat composer stays active.

**Job kinds (MVP)**
- `autodraft` — do N steps per tick (e.g., 1–2 sections) to avoid long functions.
- `draft_section` — targeted draft for a section (triggered from section workspace or coverage gaps).
- `tighten_section` — enforce word limits for a section.
- `export_docx` — build and return a file (still user‑triggered).

**Failure handling**
- On tool failure, mark job `error`, post assistant message with a single actionable ask, and do not show a dead “Try again” button.
- The “Draft generation failed” state disappears: the button is disabled until prerequisites are met.

---

## 7) Tools & Agents SDK wiring (server)

> Keep tools tiny, composable, and side‑effect‑free wherever possible. Persist outcomes in the DB, not in process memory.

**Files to add**
- `src/server/agent/runner.ts` — creates/uses an Agent session per `session_id`, invokes tools.
- `src/app/api/jobs/enqueue/route.ts` + `src/app/api/jobs/tick/route.ts` — queue endpoints.
- `src/lib/db.ts` — Supabase server client.
- `src/lib/auth.ts` — Supabase auth helpers.
- `src/lib/normalize.ts` — shape input facts; compute pre‑reqs for each section.
- `src/lib/coverage.ts` — (reuse/extend) deterministic scoring + “Fix next”.
- `src/lib/docx.ts` — already present; ensure it’s used by export route.

**Agent orchestration (pseudo)**

```ts
// runner.ts
export async function runAutodraft(sessionId: string) {
  const ctx = await loadContext(sessionId); // coverage, facts, sources
  await tools.normalize_rfp({ sessionId });
  const next = pickNext(ctx.coverage);
  if (!next) return;
  if (!hasPrereqs(next.id, ctx.facts)) {
    await postAssistant(sessionId, `To finish ${next.label}, I need: ${listMissing(next.id)}`);
    return;
  }
  const draft = await tools.draft_section({ sectionId: next.id, prompt: composePrompt(ctx, next.id) });
  await saveDraft(sessionId, next.id, draft);
  await recomputeCoverage(sessionId);
  enqueue(sessionId, { kind: 'autodraft' }); // continue until stable
}
```

**Guardrails**
- All tool outputs (coverage, drafts) are persisted immediately.
- Every tool side‑effect generates a **message** row for visibility and reload safety.
- A new run never asks the user “what next?” — it posts a single “Fix next” ask if/when prerequisites are missing.

---

## 8) UI updates (Workspace)

**Top bar**
- Project name (editable), Project switcher, Auth control.

**Left rail (Sources)**
- List of unique sources. For URLs: “View source” opens the origin URL. For files: show filename.
- Mini dedupe (disabled state) if a matching `href` or `content_hash` already exists.

**Center (Chat + stream)**
- Persist conversation. On reload, fetch last 50 messages.
- Status chip above the composer: “Autodrafting… (pause)” or “Paused (answer 2 items)”.
- Composer remains responsive while auto‑runner polls.

**Right rail (Coverage)**
- Same sections; clicking opens **Section workspace** overlay.
- Each slot shows “Complete / Partial / Missing” and the next atomic ask in small text.

**Section workspace (overlay)**
- Header: Section title + status pill + word/limit.
- Left: Markdown draft (editable).
- Right: Outstanding items list with inline inputs; Save triggers `facts.update` then re‑enqueues `autodraft`.
- Footer: “Tighten to limit” (if over), “Mark as complete” (if user confirms), “Back to coverage”.
- If prerequisites missing → the Draft button is replaced by “Answer these first” checklist.

---

## 9) Error states & empty states

- **No RFP yet** → The assistant posts: “Paste the RFP URL or drag the PDF. I’ll ingest and start drafting automatically.”
- **Ingest error** → Assistant posts: “Couldn’t import <url> (403). Try downloading the PDF or send a direct link to the solicitation HTML.”
- **Tool error** → Assistant posts a short explanation + a single ask; the UI never shows a dead button.

---

## 10) Export

- The Export button appears at all times, but the assistant recommends exporting once coverage ≥ 60%.
- Export flow posts an assistant message with a download link and appends an optional “Sources appendix”.

---

## 11) Analytics & logging

- Log every job execution (kind, ms, success/fail).
- Track coverage score over time; render a small sparkline in the coverage panel header.
- Report: TTFD (to first full draft), coverage at first draft, tighten compliance rate.

---

## 12) Acceptance tests (manual QA)

1. **Sign-in** with email link → returns to project list → open project.
2. **New project** → new session created; URL has `?s=<uuid>`.
3. **Import RFP URL** (NSF) → within 10–20s, assistant posts “Ingested … Starting draft…”.
4. **Autodraft** creates the first 1–2 sections; coverage increases; assistant posts progress.
5. **Reload** hard: messages, coverage, drafts, and sources persist.
6. **Open section** → see draft + outstanding items; answer one → coverage increases after background tick.
7. **Chat** while autodraft runs → both streams interleave; UI remains responsive.
8. **Export DOCX** → download succeeds; headings and body text styled; optional sources appendix.

---

## 13) Implementation order (do this in order; stop early if MVP “good enough”)

1. **Auth + DB**: Supabase wiring, schema, RLS, UI sign-in.
2. **Persistence**: sessions in URL/cookie, messages/coverage/drafts load on mount.
3. **Queue**: `/api/jobs/enqueue` + `/api/jobs/tick` + client poller; post assistant messages for every material change.
4. **Autodraft v1**: normalize → pick next → draft (1 section) → recompute coverage → re‑enqueue.
5. **Section workspace**: draft editor, outstanding items, prerequisite gating.
6. **Tighten v1**: word limit enforcement + compliance banner.
7. **Polish**: dedupe affordance (already ok), micro‑copy, keyboard focus, loading states.
8. **Export DOCX**: wire to existing route, ensure styles.

Stop here → MVP is shippable.

---

## 14) Notes for the implementer

- Keep all long work in the **tick** endpoint; cap per‑tick runtime to ~10s.
- Prefer short polling to SSE for now (simpler on Vercel).
- Gate “Draft” buttons with `hasPrereqs(sectionId, facts)`; otherwise show the exact facts needed.
- Post assistant messages for everything the auto‑runner does; never rely solely on the right rail to communicate progress.
- Never ask the user what to do; act and then ask for the next single fact you need.

---

## 15) Post‑MVP (nice to have, do not block)

- Vercel Cron to trigger ticks when the tab is closed.
- Rich diff view for drafts.
- Multi‑author roles & sharing.
- Confidence/ambiguity display per paragraph.

---

**End of Plan11 (final)**
