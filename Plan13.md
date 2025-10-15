
# Plan13 — Granted MVP Implementation Plan  
**Scope:** Ship a working MVP of Granted’s 3‑pane grant‑writing copilot that *ingests the RFP*, identifies what’s missing, *asks the best next questions*, and drafts each section—using the latest OpenAI **Agents SDK** plus the **Responses API** with built‑in **File Search** and **Web Search** tools (no Agent Builder/canvas).  
**Date:** 2025-10-15  
**Owner:** Engineering (with Product + Design)  
**Repo:** granted-mvp

> Context: Granted’s mission is to reduce the tedious parts of federal grant applications and make high‑quality proposals more accessible. Our MVP should reflect that mission by turning uploaded RFPs + org/project context into guided, low‑friction drafting. fileciteturn0file1

---

## 0) TL;DR (what we’re shipping)
1. **Three‑pane UX**: **Left = Sources & Coverage**, **Center = Draft Editor**, **Right = Conversational Coach** (active questions + chat).  
2. **Real ingestion**: When a PDF/URL is uploaded, we *read the contents* via OpenAI **File Search** (vector stores), extract facts (title, deadline, portal, eligibility, etc.), and *seed coverage* + drafts automatically. citeturn0search1turn0search13  
3. **Coverage engine**: A rules & confidence model computes `missing | partial | complete` per section and maintains a **ranked backlog** of questions that unlock the highest coverage/quality next.  
4. **Best‑Next Questioning**: The Coach asks the minimum set of high‑value questions (gated “Definition of Done” per section) and updates the editor live.  
5. **Draft generation**: Section‑specific prompts use (a) extracted RFP facts, (b) org/project context, (c) prior sections; drafts stream into the editor with **inline citations** back to sources.  
6. **Save & export**: Autosave, per‑section versioning, and **Export DOCX**.  
7. **Observability**: Structured job logs, error details, and dashboard; **green Vercel deploy** pipeline with Supabase migrations and seeds.

---

## 1) What’s wrong today (and why)
- **Coverage doesn’t move** after you upload files because `normalizeRfp()` only inspects *filenames/URLs, chat, and existing drafts*—it never queries PDF/HTML text; therefore it never finds title/deadline/portal and keeps asking the same generic items.  
- Earlier **jobs failed with “Unknown error”** because thrown values weren’t guaranteed to be `Error` instances and we swallowed stack traces; new SQL fixed schema issues but we still need robust diagnostics.  
- **Drafts ignore Granted Overview.pdf** content because we never wire file contents into the drafting prompts; only “presence of files” is known, not their text.  
- **UX friction**: Questions and drafts are interleaved; users can’t see “what’s blocking this section” at a glance; the “Remaining items” list isn’t authoritative.

> Fix direction: add a real ingestion pass powered by File Search; persist extracted facts; compute coverage from facts + drafts; and drive *question selection* from that coverage. Then render a clear, section‑first flow in the 3‑pane layout.

---

## 2) North‑Star UX (MVP)
**Layout**
- **Left (Sources & Coverage)**  
  - *Sources*: list every uploaded PDF/URL; show parsing state.  
  - *Coverage Map*: 9 sections with status chips (missing/partial/complete) and a tiny progress bar. Clicking a section focuses the center Editor and repopulates the right Coach with *that section’s* open questions.  
- **Center (Draft Editor)**  
  - Large markdown editor for the *selected section*; streaming insert from the Draft service; inline source pins; per‑section Save; version menu.  
- **Right (Conversational Coach)**  
  - **Active Questions** at the top (gated “Definition of Done” for the selected section).  
  - Below that: chat history and freeform Q&A.  
  - When a question is answered or we extract the fact from sources, the question disappears, coverage updates, and the Editor re‑drafts deltas.

**On section click**
1. Load section’s **Definition of Done** (DoD).  
2. Compute coverage + confidence; if any DoD item unresolved → render **Top 3 questions**.  
3. If DoD satisfied → enable **Generate/Refresh Draft**; otherwise prompt user to answer or “Auto‑extract from sources”.

**Before first draft**  
- If required facts are confidently extracted (≥0.8) → draft immediately.  
- Else → present questions first; draft once DoD met (or after user allows “Draft with assumptions”).

---

## 3) System Design (high level)
### 3.1 Major components
- **Ingestion Service** (Edge function): builds/updates an OpenAI **Vector Store**, runs targeted **File Search** queries to extract canonical facts; stores results + citations. citeturn0search1turn0search13  
- **Coverage Engine**: maps facts + drafts → section statuses; produces **ranked questions** by information gain.  
- **Draft Service**: uses the **Responses API** with built‑in tools (File Search, Web Search) to generate or update a section draft. citeturn0search14turn0search2  
- **Coach Agent** (OpenAI **Agents SDK**): orchestrates question‑asking and tool usage; streams reasoning results to UI (no Agent Builder/canvas). citeturn2view0  
- **Web App**: Next.js on Vercel; Supabase for auth, DB, and storage.

### 3.2 Why Agents SDK + Responses API
- **Agents SDK** gives a small set of primitives (agents, tools, handoffs, guardrails) and *built‑in tracing*; it works with the **Responses API** and OpenAI built‑in tools like file/web search. citeturn2view0  
- **Responses API** is the current core primitive with streaming, unified output, and built‑in tools (**file_search**, **web_search**). citeturn0search14turn0search2

---

## 4) Data model (Supabase)
```sql
-- projects (one per proposal)
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users (id),
  title text,
  created_at timestamptz default now()
);

-- sources (uploaded files and URLs)
create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  label text not null,
  href text,                 -- original URL (if any)
  file_id text,              -- OpenAI file id
  vector_store_id text,      -- OpenAI vector store id(s)
  meta jsonb default '{}',
  status text default 'indexed', -- indexed | indexing | error
  created_at timestamptz default now()
);

-- extracted_facts (normalized, with citations)
create table if not exists extracted_facts (
  id bigserial primary key,
  project_id uuid references projects(id) on delete cascade,
  section text not null,     -- e.g., 'opportunity_overview'
  key text not null,         -- e.g., 'solicitation_title'
  value text not null,
  confidence numeric not null,
  source_ids text[] default '{}', -- list of OpenAI file ids
  annotations jsonb default '[]', -- tool annotations
  created_at timestamptz default now()
);

-- section_drafts (markdown)
create table if not exists section_drafts (
  id bigserial primary key,
  project_id uuid references projects(id) on delete cascade,
  section text not null,
  version int not null default 1,
  markdown text not null,
  citations jsonb default '[]',
  created_at timestamptz default now()
);

-- jobs + logs
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  type text not null,        -- ingest | draft | coverage
  payload jsonb,
  status text not null default 'queued', -- queued | running | done | error
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists job_logs (
  id bigserial primary key,
  job_id uuid references jobs(id) on delete cascade,
  level text not null,       -- info | warn | error
  message text not null,
  details jsonb,
  created_at timestamptz default now()
);
```

**RLS**: enable row‑level security so users only see their own projects/sources/drafts.

---

## 5) Ingestion + Coverage (how it works)
### 5.1 Ingestion pass (on upload or on‑demand)
1. **Upload** file(s) to OpenAI *Files* and add to a **Vector Store**; persist `file_id` and `vector_store_id`. citeturn0search13  
2. **Targeted File Search** queries (Responses API tool) like:  
   - “solicitation title”, “deadline”, “submission portal”, “eligibility”, “SAM/UEI”, “cost share”, “evaluation criteria” …  
   - Use `max_num_results`, `rank_by_relevance`, and *metadata filters* if you tag files. citeturn0search1  
3. **Normalize** into `extracted_facts` with `confidence` and `annotations` (tool citations).  
4. **Write** a structured event to `job_logs` with *full* error or result payloads (do not collapse to “Unknown error”).

### 5.2 Coverage engine
- Each section has a **DoD** checklist (example below).  
- A section is **complete** when all DoD items have `confidence ≥ 0.8` from either:  
  (a) extracted facts, (b) user answers, or (c) content verified in the saved draft.  
- Otherwise it’s **partial** if at least one DoD item is present, **missing** if none present.  
- The engine emits the **Top‑N questions** that—if answered—raise coverage the most (information gain).

**Opportunity Overview – DoD example**
- `solicitation_title`  
- `deadline` (timestamp + timezone)  
- `submission_portal` (name + URL)  
- `funder` (agency, program code), optional  
- Each fact has ≥1 citation link to a source (annotation).

---

## 6) Drafting
- **Prompt inputs**: extracted facts + saved org/project context + relevant prior sections (center editor text).  
- **Tools**:  
  - `file_search` to quote exact language and attach annotations (citations).  
  - `web_search` *only* when a fact is missing or stale (e.g., updated deadline on the agency page). citeturn0search2  
- **Output**: markdown for the section.  
- **Idempotent updates**: the service computes a **diff** and appends a new `section_drafts` version; the editor renders a streaming patch (so users see exactly what changed).

---

## 7) Orchestration with the **Agents SDK** (no Agent Builder)
```ts
// server/agents/grantCoach.ts
import { Agent, run } from '@openai/agents';
import { OpenAIProvider, OpenAIResponsesModel, fileSearchTool, webSearchTool } from '@openai/agents-openai';

const provider = new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY! });
const model = new OpenAIResponsesModel({ provider, model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini' });

export const grantCoach = new Agent({
  name: 'Grant Coach',
  model,
  instructions: `You help users complete each grant section. 
  Prefer file_search over web_search. When you lack a fact, ask one concise question at a time.`,
  tools: [
    fileSearchTool({ vectorStoreIds: () => getVectorStoreIdsForProject() }),
    webSearchTool({ allow: ['nsf.gov', 'grants.gov'] }), // narrow surface area
    /* plus function tools that call our own code: persistFact(), enqueueJob(), etc. */
  ],
});

// Example: ask best-next question given current coverage
export async function askNext(projectId: string) {
  return run(grantCoach, {
    messages: [{ role: 'user', content: `Project ${projectId}: What should we ask next?` }],
  });
}
```
*Why this stack?* Agents SDK exposes `fileSearchTool` & `webSearchTool` helpers and handles the agent loop + tracing; **Responses API** is the underlying model runner. citeturn2view0turn0search14turn0search2

---

## 8) API surface (Next.js/Vercel)
- `POST /api/upload` → creates vector store (if needed), uploads file(s), enqueues `ingest`.  
- `POST /api/ingest/:projectId` → runs §5.1, writes `extracted_facts`.  
- `POST /api/coverage/:projectId` → recompute coverage + ranked questions.  
- `POST /api/draft/:projectId/:section` → run Draft Service, save `section_drafts`.  
- `POST /api/coach/:projectId/:section/answer` → persist answer as fact, rerun coverage, maybe draft.  
- `GET /api/sections/:projectId` → statuses + top questions per section.

---

## 9) UI blueprint (Next.js + Tailwind)
- **Left**: Sources list (with parsing badges) + Coverage Map (chips + mini bars).  
- **Center**: Editor (markdown, citations, versioning), “Generate/Refresh Draft”, “Save”.  
- **Right**: Coach (Active Questions always pinned first; then chat).  
- **Micro‑interactions**
  - When a user uploads an RFP → progress shows: “Indexing → Extracting facts → Coverage updated → 3 questions ready”.  
  - Clicking a question opens a small answer form (short text, select, date).  
  - “Auto‑extract from sources” runs file search; if found with ≥0.8 confidence, it fills the answer and cites.

---

## 10) Error handling & observability
- Wrap every job step in `try/catch` and log **full** `error.stack || JSON.stringify(error)` to `job_logs`.  
- Promote meaningful errors into the UI (toast + expandable details).  
- Vercel: enable **Log Drains** / `vercel logs` for lambdas; include the job id in all logs.  
- Add a `/api/health` that checks DB, OpenAI key, and vector store reachability.

---

## 11) Security & privacy
- Use Supabase RLS; signed upload URLs; don’t echo tool call traces to the client.  
- Restrict web search domains; avoid sending secrets in prompts.  
- Add a **redaction pass** on drafts (e.g., emails, phone numbers) before sharing.

---

## 12) Deployment (CLI‑first) — **goal: green Vercel deploy**
### 12.1 Supabase (CLI)
```bash
# Auth + link
supabase login
supabase link --project-ref <your-ref>

# Migrate schema
supabase db push

# Verify RLS and tables
supabase db diff
supabase db remote commit -m "Plan13 schema"

# (Optional) local dev DB
supabase start
```

### 12.2 Vercel (CLI)
```bash
# Auth + link
vercel login
vercel link

# Env vars
vercel env add OPENAI_API_KEY
vercel env add OPENAI_MODEL gpt-4o-mini
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY

# Pull env to local for dev
vercel env pull .env.local

# Build + deploy
vercel --prod

# Confirm "READY" (green) and inspect logs
vercel ls | head -n 5
vercel logs <deployment-url> --since 1h
```
*Tip:* Failing jobs should be visible via `jobs.status` + `job_logs`. The deploy should show a **green “Ready”** badge on the Vercel dashboard and no function errors for `/api/ingest`, `/api/draft`, `/api/coverage`.

---

## 13) Acceptance criteria (MVP is “done” when)
1. Upload NSF SBIR RFP (or any PDF/URL) → **title, deadline, portal** auto‑extracted with citations; Coverage shows **Opportunity Overview = complete**.  
2. The Coach displays **Top 3 questions** for Eligibility & Project Narrative without manual prompting.  
3. Clicking **Generate Draft** for any section streams content into the editor, with citations to the RFP for factual claims.  
4. User answers a question → coverage updates within 2s and the draft delta reflects the new fact.  
5. Export DOCX produces a well‑formed document using the latest draft versions.  
6. **Green Vercel deploy**; no “Unknown error” in any `jobs` row for the test project.

---

## 14) Implementation checklist (for the AI/engineer doing the work)
**A. Plumbing & packages**
- [x] Add `@openai/agents` + `@openai/agents-openai` and update the OpenAI Node SDK. citeturn2view0turn0search22  
- [x] Create `server/agents/grantCoach.ts` (see §7) and wire to `/api/coach`.  
- [x] Add typed **function tools**: `persistFact`, `enqueueJob`, `getCoverage`, `draftSection`.

**B. File Search & Vector Stores**
- [x] Create vector store per project; upload files/URLs → store `file_id`, `vector_store_id`.  
- [x] Implement **Ingestion Service** to run *targeted* File Search queries and write `extracted_facts` with `confidence` + `annotations`. citeturn0search1turn0search13  
- [x] Add metadata tagging (e.g., `kind: RFP`, `agency: NSF`) and apply metadata filters in queries.

**C. Coverage Engine**
- [x] Define DoD for all 9 sections and encode as JSON.  
- [x] Implement status computation + **Top‑N question ranking** (information gain heuristic).  
- [x] Expose `/api/coverage/:projectId` and persist “what changed”.

**D. Draft Service**
- [x] Build a section‑aware prompt template; prefer **File Search**; fall back to **Web Search** for stale/missing facts (with domain allow‑list). citeturn0search2  
- [x] Stream drafts; save `section_drafts` versioned; compute and show diff in the editor.

**E. UI**
- [x] 3‑pane layout: Left (Sources & Coverage), Center (Editor), Right (Coach).  
- [x] Section navigator: clicking a section loads DoD + open questions; Editor scrolls to that section.  
- [x] “Active Questions” pinned above chat; answer widgets (date, select, short text).  
- [x] Inline citation chips link to source excerpts.

**F. Reliability & logs**
- [x] Replace generic catch with robust error capture (`error.stack || JSON.stringify(error)`).  
- [x] Write `job_logs` for every tool call and agent turn; surface in an internal “Runs” panel.  
- [x] Add `/api/health` and basic telemetry (latency, tool call counts).

**G. Deployment**
- [ ] Run **Supabase CLI**: `login`, `link`, `db push`.  
- [ ] Run **Vercel CLI**: set env, `vercel --prod`; confirm **READY/green** and zero function errors.  
- [ ] Smoke test the 6 acceptance items (above) and record a screen capture.

---

## 15) References (for implementers)
- **Agents SDK (TypeScript)**: primitives, tools, tracing, and `fileSearchTool` / `webSearchTool`. citeturn2view0  
- **File Search (built‑in)** with vector stores; upload/add files; metadata filters. citeturn0search1turn0search13  
- **Web Search (built‑in)** usage & parameters. citeturn0search2  
- **Responses API** reference & streaming. citeturn0search14

---

## Appendix A — Section list & DoD seeds (editable)
**1) Opportunity overview** — title, deadline(+tz), portal(name+URL), agency/program; ≥1 citation each.  
**2) Eligibility & compliance** — applicant type, SAM/UEI, cost share, certifications.  
**3) Project narrative** — problem, beneficiaries, innovation, impact, risks, mitigation.  
**4) Organizational capacity** — past performance, facilities, partnerships.  
**5) Key personnel** — roles, resumes/links, effort %.  
**6) Budget & cost share** — line items (personnel/other), match, indirect rate.  
**7) Timeline & milestones** — Gantt or phases, key dates.  
**8) Evaluation plan** — metrics, data sources, success criteria.  
**9) Attachments & appendices** — required forms, letters, supplements.

---

## Appendix B — Example Responses API (direct) call with File Search
```ts
import OpenAI from 'openai';
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const r = await client.responses.create({
  model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  input: `Extract solicitation title, deadline (with TZ), and submission portal from the attached RFP.`,
  tools: [{
    type: 'file_search',
    vector_store_ids: [process.env.OPENAI_VECTOR_STORE_ID!],
    max_num_results: 5
  }],
  system: 'Return JSON with fields: title, deadline_iso, deadline_tz, portal_name, portal_url, citations[].'
});

console.log(r.output_text);
```
*Notes*: Responses API is the core model runner; File Search is a **built‑in tool** that executes and returns annotations you can turn into citations. citeturn0search14turn0search1

---

## Appendix C — Web Search guardrails (example)
- Prefer **file_search**; only use **web_search** when the RFP file is ambiguous/missing data.  
- Restrict to `nsf.gov`, `grants.gov`, or agency root domains, and show source URLs in the UI. citeturn0search2

---

**That’s Plan13.** Once the ingestion & coverage loop is wired to File Search and the Coach is powered by the Agents SDK, coverage will move on its own, questions will be laser‑focused, and the draft editor becomes the center of gravity—exactly the MVP we want.
