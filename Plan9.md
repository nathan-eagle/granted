
# Plan9 — Granted MVP (Sessions + Drag‑and‑Drop + RFP‑Agnostic Coverage)
**Target host:** Vercel (auto‑deploy from GitHub main)  
**Back end:** Next.js 15 (Node runtime) + OpenAI Agents SDK + OpenAI Files/Vector Stores  
**Persistence:** Supabase (Postgres + optional Auth) for sessions/projects/messages/sources metadata  
**Output:** DOCX only (for now)  
**Scope:** RFP‑agnostic, URL & PDF ingest (RFP, org site, bios/CVs, resumes), conversational “Fix next” loop

> This checklist favors the simplest path to a working MVP. Each step is atomic so an AI agent (or you) can implement and ship incrementally.

---

## 0) Outcomes we want from this iteration
- [x] Users can paste one or more URLs **and/or** drag‑drop PDFs. All show up in **Sources** and become searchable by the agent.
- [x] The agent immediately **normalizes the RFP** into a basic coverage map, posts **what’s missing**, and proposes a **single “Fix next”** chip.
- [x] Conversations, sources, coverage snapshots, and drafts are **saved and reloadable** (Supabase).
- [x] **DOCX export** works reliably.
- [x] Thin, stable Next.js UI; no Bubble; minimal moving parts.

Non‑goals: auth UX, multi‑tenant orgs, budgeting wizard, reviewer persona simulation.

---

## 1) Repository skeleton (what the agent should create/keep)
```
/src
  /app
    /api
      chat/route.ts            # Agents SDK chat endpoint (server)
      upload/route.ts          # File upload → OpenAI Files → Vector Store
      import-url/route.ts      # Fetch remote URLs → Files → Vector Store
      export/route.ts          # Markdown → DOCX (stream/attachment)
      health/route.ts
    layout.tsx
    page.tsx
    globals.css
  /components
    Workspace.tsx
    SourceRail.tsx
    CoveragePanel.tsx
    Message.tsx
    FixNextChips.tsx
    UploadDropzone.tsx         # NEW: drag & drop + file picker + progress
    Chat.tsx                   # Thin chat composer + stream handler
  /lib
    agent.ts                   # getOrCreateAgent() + run wrapper
    agent-context.ts           # GrantAgentContext shape + in-memory cache
    openai.ts                  # OpenAI client
    vector-store.ts            # getOrCreateVectorStore(), attachFiles...
    coverage.ts                # createCoverageSnapshot(), score calc
    docx.ts                    # markdown→docx builder
    tighten.ts                 # word/page estimate + constraints
    supabase.ts                # server and client helpers
    types.ts                   # shared types (CoverageSnapshot, etc.)
/src/server/tools              # Agents SDK tools (normalize_rfp, etc.)
```

> Note: Several `/lib/*` files are **required** by the existing routes/tools; add them now if they’re missing to avoid runtime failures.

---

## 2) Environment & project settings
Create `.env.local` (and mirror these in Vercel Project Settings → Environment Variables):
```
OPENAI_API_KEY=...
NEXT_PUBLIC_APP_NAME=Granted

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ey...
SUPABASE_SERVICE_ROLE_KEY=ey...  # server-only

# Optional: allow local+CIs to call server actions if you use them
NODE_ENV=production
```

**Next config:** keep Node runtime for all API routes. Remove overly restrictive `serverActions.allowedOrigins` or set it via env; server actions aren’t required for this MVP.

---

## 3) Supabase — minimal persistence (SQL migration)
Create a fresh Supabase project. Run the SQL below in the SQL editor.

```sql
-- Sessions & projects
create table projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  rfp_url text,
  vector_store_id text,   -- OpenAI Vector Store id for this project
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  agent_id text,           -- OpenAI Agent id (if you persist/override)
  agent_thread_id text,    -- optional: Thread id if you use Threads
  status text default 'active',
  created_at timestamptz default now()
);

-- Conversation & state
create table messages (
  id bigserial primary key,
  session_id uuid references sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant','tool','system')),
  content text not null,
  envelope jsonb,          -- coverage/fixNext/sources/tighten/provenance deltas
  created_at timestamptz default now()
);

create table sources (
  id bigserial primary key,
  session_id uuid references sessions(id) on delete cascade,
  label text not null,
  kind text not null check (kind in ('file','url')),
  href text,
  openai_file_id text not null,
  created_at timestamptz default now()
);

create table coverage_snapshots (
  id bigserial primary key,
  session_id uuid references sessions(id) on delete cascade,
  score numeric not null,
  summary text,
  payload jsonb not null,
  created_at timestamptz default now()
);

create table tighten_snapshots (
  id bigserial primary key,
  session_id uuid references sessions(id) on delete cascade,
  within_limit boolean not null,
  word_estimate integer,
  page_estimate numeric,
  payload jsonb not null,
  created_at timestamptz default now()
);

create table provenance_snapshots (
  id bigserial primary key,
  session_id uuid references sessions(id) on delete cascade,
  total_paragraphs integer not null,
  paragraphs_with_provenance integer not null,
  payload jsonb not null,
  created_at timestamptz default now()
);

-- Optional RLS (defer until you add auth)
alter table projects enable row level security;
alter table sessions enable row level security;
alter table messages enable row level security;
alter table sources enable row level security;
alter table coverage_snapshots enable row level security;
alter table tighten_snapshots enable row level security;
alter table provenance_snapshots enable row level security;
-- For MVP, create permissive policies or use service role server-side only.
```

**Client strategy (no auth yet):** generate a cookie `granted_session_id` on first visit (UUID). Use it to upsert a `projects` row (title = "Untitled Project") and a `sessions` row. Store IDs in `localStorage` to re-open later.

- [x] Migration committed at `granted-mvp/supabase/migrations/20251012_initial_schema.sql`, including helper indexes and `touch_project_for_session()` RPC.

---

## 4) Fix the ingest pipeline (URLs + PDFs)
**4.1 Drag & drop / file picker (UploadDropzone.tsx)**  
Implement a dropzone component that posts `FormData` to `/api/upload` with `sessionId` and `files[]`. On success, update the `SourceRail` immediately and fire a follow-up `POST /api/chat` `"command":"normalize_rfp"` to build coverage.

Pseudo‑implementation:
- On drop or select: show progress; chunk large files if needed (nice-to-have).
- POST `/api/upload` (already implemented server-side). Expect `{ fileIds: string[], sources: SourceAttachment[] }`.
- [x] Emit `onSourcesUpdate([...prev, ...sources])` and then `chat({ kind: 'tool', name: 'normalize_rfp' })`.
- [x] Implemented dropzone in `src/components/UploadDropzone.tsx`, integrated into the chat composer, and auto-triggers `normalize_rfp` after successful uploads.

**4.2 Import URLs (in Chat.tsx)**  
- [x] Add a small input + button (“Import”). When clicked, POST to `/api/import-url` with `{ sessionId, urls: [ ... ] }` and union the returned `sources` into state; then call `normalize_rfp` via chat.
- [x] URL import is wired in `Chat.tsx` with Supabase persistence of returned sources.

**4.3 Vector store glue (lib/vector-store.ts)**  
- [x] `getOrCreateVectorStore(sessionId)` → make a vector store once; cache id in Supabase `projects.vector_store_id`.
- [x] `attachFilesToVectorStore(sessionId, fileIds)` → upload batch to that vector store.
- [x] Return the vector store id so the Agent can search it by default.
- [x] `src/lib/vector-store.ts` now persists vector store ids per project via Supabase and reuses them across sessions.

---

## 5) Wire up the Agent (Agents SDK)
**5.1 Agent contract (lib/agent.ts)**
- [x] Create a single Agent with instructions: *“You are a grants copilot. Always: (1) normalize the RFP into coverage slots, (2) pick exactly one Fix‑Next, (3) ask for URLs/files the moment they’re needed, (4) keep a running draft in markdown with short citations, (5) when asked ‘export’, call export_docx.”*
- [x] Register tools exported from `/src/server/tools`: `normalize_rfp`, `coverage_and_next`, `draft_section`, `tighten_section`, `export_docx`, `ingest_from_urls`.
- [x] Default tool context includes `sessionId`, vector store id, and the last known `coverage` and `sources`.

**5.2 Chat API (app/api/chat/route.ts)**
- [x] `POST` payload: `{ sessionId, message?: string, command?: string }`
- If `command` is present, run the matching tool directly; otherwise create an Agent run with the user message.
- Stream back events as **server-sent events (SSE)** or as a JSON envelope `{ messages[], coverage?, fixNext?, sources?, tighten?, provenance? }` consolidated at end.
- Persist each user/assistant message and the final envelope in `messages` (Supabase).
- [x] `/api/chat` delegates to the streaming agent handler, persists user/assistant turns, and captures coverage/fix-next/tighten/provenance snapshots.

**5.3 Start-of-session behavior**
- [x] If no sources exist yet → Agent should immediately respond with **exact asks**:  
  “Paste the RFP URL or drag the PDF here. Then share an org URL and a 3–5 sentence project idea.”  
  Provide chips for: *Import URL*, *Attach PDF*, *Paste project idea*.
- [x] Initial assistant message now prompts for RFP URL/PDF, org URL, and a 3-5 sentence project idea on first load.

---

## 6) Minimum viable coverage (RFP‑agnostic)
**Goal:** a deterministic, useful right‑rail within seconds, even before deep parsing.

**6.1 `coverage.ts`**
- [x] Provide `createCoverageSnapshot(slots, summary)` and `score` calculator. Status enum: `missing | partial | complete`.

**6.2 `normalize_rfp` tool (server/tools/normalizeRfp.ts)**
- [x] Phase A (fast): If vector store is empty → emit a 2‑slot baseline: *Project narrative* (missing), *Budget justification* (missing), summary: “Baseline coverage initialized. Ingest more material…”.  
- [x] Phase B (heuristic): If vector store has an RFP: run File Search for common markers (“Project Description”, “Budget”, “Eligibility”, “Page limit”, “Submission instructions”) and map to standardized slots. Persist snapshot via Supabase.  
- [x] Always set one **Fix next**: ask for the most impactful missing slot.

**6.3 `coverage_and_next` tool**  
- [x] Compute **Fix next** by finding the first non‑complete slot with the highest weight; emit one chip only.

---

## 7) Tighten & DOCX export
- [x] `tighten_section` uses `tighten.ts` to count words and estimate pages based on a preset (11pt, 1” margins, single spacing). Return `withinLimit`, `wordCount`, `pageEstimate`.
- [x] `export_docx` uses `docx.ts` to transform markdown → styled DOCX. Include minimal styles and optional Sources appendix.

---

## 8) Persistence wiring
- On every chat completion, upsert in Supabase:
  - `messages` row for the assistant turn (store the envelope).
  - `coverage_snapshots` row if `coverage` changed.
  - `sources` rows for any new attachments.
- On page load, boot from Supabase using the `sessionId`: messages, latest coverage, sources.
- [x] Agent route and upload/import endpoints persist messages, coverage snapshots, tighten/provenance records, and sources; `ensureSession()` boots the workspace from Supabase state.

---

## 9) UI checklist (Workspace.tsx + Chat.tsx)
- Show dropzone and URL import inline with the composer.
- Show **Fix next** as a single chip above the composer; clicking it either sends a targeted question (“Please paste your org URL”) or opens the file picker.
- Update **Sources** immediately after successful upload/import.
- Update **Coverage** whenever the agent emits a new snapshot.
- Keep messages very short; always end with a concrete next ask (one sentence) and, when relevant, a small confirmation chip (e.g., “Draft Project Summary (1 page)” / “Ask for team bios”).
- [x] Workspace/Chat render the dropzone, URL import, Fix-next chips, and live sources/coverage updates.

---

## 10) Deployment
- [x] Connect GitHub repo to Vercel; set env vars.
- [x] Build command: `next build --turbopack` (or plain `next build` if you observe edge cases).
- [x] Runtime: Node for all API routes.
- [ ] Post‑deploy smoke test:
  [ ] 1) Paste NSF RFP URL → Source appears; Coverage shows at least 3–5 slots.  
  [ ] 2) Drag a PDF → Source count increments; Coverage updates.  
  [ ] 3) Type a 3–5 sentence project idea → Agent replies with the next ask and offers to draft a Project Summary.  
  [ ] 4) Export DOCX → downloads a valid file.

---

## 11) Acceptance tests (manual)
- [ ] **Ingest:** URL import returns `{sources.length > 0}`; PDF upload returns `{fileIds.length > 0}`; both visible in the rail.
- [ ] **Coverage:** First snapshot within 3 seconds, score between 0–20%. Improves deterministically as content is added.
- [ ] **Fix‑next:** Exactly one actionable chip is present after every assistant turn.
- [ ] **Tighten:** Given a 900‑word chunk with 750‑word limit, `withinLimit=false` and `pageEstimate≈1.8`.
- [ ] **Export:** DOCX opens in Word/Google Docs with headings preserved.

---

## 12) Code stubs the agent should add (minimal)
**12.1 `/src/lib/openai.ts`**
```ts
import OpenAI from 'openai';
export const getOpenAI = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
```

**12.2 `/src/lib/vector-store.ts`**
```ts
import { getOpenAI } from './openai';
import { createClient } from '@supabase/supabase-js';

const cache = new Map<string, string>();

export async function getOrCreateVectorStore(sessionId: string): Promise<string> {
  if (cache.has(sessionId)) return cache.get(sessionId)!;
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: sess } = await sb.from('sessions').select('project_id').eq('id', sessionId).single();
  const { data: proj, error } = await sb.from('projects').select('vector_store_id').eq('id', sess.project_id).single();
  const client = getOpenAI();
  let id = proj?.vector_store_id || null;
  if (!id) {
    const vs = await client.vectorStores.create({ name: `granted-${sessionId}` });
    id = vs.id;
    await sb.from('projects').update({ vector_store_id: id }).eq('id', sess.project_id);
  }
  cache.set(sessionId, id!);
  return id!;
}

export async function attachFilesToVectorStore(sessionId: string, fileIds: string[]) {
  const client = getOpenAI();
  const vsId = await getOrCreateVectorStore(sessionId);
  await client.vectorStores.fileBatches.upload({ vector_store_id: vsId, file_ids: fileIds });
  return vsId;
}
```

**12.3 `/src/components/UploadDropzone.tsx` (core idea)**
```tsx
'use client';
import { useCallback, useRef, useState } from 'react';
import type { SourceAttachment } from '@/lib/types';

export default function UploadDropzone({ sessionId, onDone }:{ sessionId:string; onDone:(s:SourceAttachment[])=>void }){
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const postFiles = async (files: File[]) => {
    if (!files.length) return;
    setBusy(true);
    const fd = new FormData();
    fd.append('sessionId', sessionId);
    files.forEach(f => fd.append('files', f));
    const res = await fetch('/api/upload', { method:'POST', body: fd });
    const json = await res.json();
    setBusy(false);
    onDone(json.sources || []);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    postFiles(Array.from(e.dataTransfer.files));
  }, []);

  return (
    <div onDrop={onDrop} onDragOver={e=>e.preventDefault()}>
      <button className="upload-button" onClick={()=>inputRef.current?.click()} disabled={busy}>Attach PDF</button>
      <input ref={inputRef} type="file" accept=".pdf,.doc,.docx" multiple hidden onChange={e=>postFiles(Array.from(e.target.files||[]))} />
    </div>
  );
}
```

**12.4 `/src/app/api/chat/route.ts`** – minimal run wrapper (pseudocode)
```ts
export const runtime = 'nodejs';
import { getAgent } from '@/lib/agent';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const { sessionId, message, command } = await req.json();
  const agent = await getAgent(sessionId);
  const result = await agent.run({ sessionId, message, command }); // implement in lib/agent.ts
  // persist to supabase: messages, coverage snapshot, sources
  return Response.json(result);
}
```

---

## 13) What to cut if anything breaks
- Skip streaming; return a single JSON envelope for now.
- Skip page estimates and use word limits only.
- Skip persistent agent id; recreate per request using the same tools.

---

## 14) Roadmap after MVP
- Auth (email magic links) and proper RLS.
- Section‑specific drafting presets (NSF, NIH, DoE) behind a single preset switch.
- Observability: log run durations, token spend, and coverage deltas.
- One‑click “Start over” (new session, preserve sources).

---

## FAQ
**Why Supabase?** It’s the fastest way to persist sessions/messages and to reload a draft later without building infra. You can replace it with Postgres later without changing the client API.

**Why OpenAI Vector Stores instead of DIY embeddings?** Because the Agents SDK can search them natively; less code, fewer moving parts.

**How do URLs for bios/CVs work?** Treat them the same as RFP URLs: import and push into the same vector store; the agent will ask for a person’s bio URL when a team section is the current “Fix next”.

---

## Done = Working demo script
1) Paste NSF solicitation URL → Sources shows it; Coverage populates baseline → Fix next asks for a project summary or org URL.  
2) Drag “Granted Overview.pdf” → Sources increments; Coverage improves; Fix next offers “Draft Project Summary”.  
3) Click “Draft Project Summary” → agent generates a one‑page summary with citations.  
4) Click “Export DOCX” → File downloads successfully.
