
# Plan10.md — Bug Fixes + Minimal Features to Reach a Stable Conversational MVP
**Target**: Vercel-hosted Next.js (App Router) + OpenAI Agents SDK. Persist users/projects/sessions in Supabase.  
**Primary goals**: (1) Stop “refresh resets everything”, (2) de-duplicate sources & make import reliable, (3) make drag‑and‑drop uploads work, (4) show deterministic coverage that persists, (5) add login and a “grant switcher”, (6) let user click a Coverage item to open a focused section editor (draft + remaining items + chat prompts), (7) keep everything simple and shippable.

---

## 0) Why coverage and assistant replies vanish now (root causes to address)
- **Ephemeral session IDs**: The app generates a new `sessionId` **on every mount** via `useState(() => crypto.randomUUID())`, so a hard refresh creates a new session key each time — the UI then loads nothing. ✔ _Fix by persisting a stable session id in a cookie/localStorage and reuse it across reloads._
- **No durable DB reads on load**: Coverage/messages aren’t restored on first render because nothing is fetched from storage keyed by the stable session id. ✔ _Fix by reading Supabase for session → messages → latest coverage snapshot on mount._
- **Duplicate Sources**: Dedupe uses the transient OpenAI **file id** (changes each upload), so importing the same URL multiple times creates duplicates. ✔ _Fix by normalizing/merging on `href` or a content hash, not `file.id`._
- **Drag‑and‑drop isn’t wired**: The UI labels say “drag in a PDF”, but there’s no drop target tied to `/api/upload`. ✔ _Add a file dropzone and an `<input type=file multiple>` that posts `sessionId` + `files[]`._

References in current repo:
- `Workspace.tsx` generates a new session id per mount and dedupes sources by `source.id` (OpenAI file id). fileciteturn0file3
- `ingestFromUrls.ts` uploads each URL as a **new OpenAI file**, producing a brand-new `id` every time; it labels with the URL filename and sets `kind: "url"`, but does not attempt dedupe. fileciteturn0file3
- `CoveragePanel.tsx` shows 0% when no snapshot is provided by props; nothing refetches after reload. fileciteturn0file3
- The repo already sketches “Agents tools” (`normalizeRfp`, `coverageAndNext`, `draftSection`, etc.), which we will keep but wire to persistence + UI. fileciteturn0file3
- The design doc already calls for deterministic coverage + “Fix next” flow; we align to that. fileciteturn0file5

---

## 1) Environment & Dependencies
- [ ] Set **Vercel env vars** (Project → Settings → Environment Variables):
  - `OPENAI_API_KEY` = your key
  - `NEXT_PUBLIC_APP_NAME` = `Granted`
  - `NEXT_PUBLIC_SUPABASE_URL` = Supabase project URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon key
  - `SUPABASE_SERVICE_ROLE_KEY` = service role (server-only)
- [x] Add deps (root of repo):  
  ```bash
  pnpm add @supabase/supabase-js @supabase/ssr js-cookie uuid
  pnpm add -D zod typescript @types/node @types/react @types/react-dom
  ```
- [x] Pin OpenAI Agents SDK versions (already in `package.json`; keep as-is). fileciteturn0file3

---

## 2) Database (Supabase) — Minimal schema
Run this SQL in Supabase SQL editor:

```sql
-- USERS
create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  created_at timestamptz default now()
);

-- GRANTS/PROJECTS
create table if not exists grants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references app_users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- SESSIONS (conversation sessions bound to a grant)
create table if not exists sessions (
  id uuid primary key,
  grant_id uuid references grants(id) on delete cascade,
  vector_store_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- MESSAGES
create table if not exists messages (
  id bigserial primary key,
  session_id uuid references sessions(id) on delete cascade,
  role text check (role in ('user','assistant','system','tool')) not null,
  content text not null,
  created_at timestamptz default now()
);

-- COVERAGE SNAPSHOTS
create table if not exists coverage_snapshots (
  id bigserial primary key,
  session_id uuid references sessions(id) on delete cascade,
  score numeric,
  summary text,
  slots jsonb,
  created_at timestamptz default now()
);

-- SOURCES (OpenAI file ids + canonical hrefs)
create table if not exists sources (
  id text primary key,          -- OpenAI file id
  session_id uuid references sessions(id) on delete cascade,
  label text,
  kind text check (kind in ('file','url')) not null,
  href text,                    -- present when kind='url'
  content_sha256 text,          -- optional content hash for dedupe
  created_at timestamptz default now()
);

-- DRAFTS (per coverage slot/section)
create table if not exists drafts (
  id bigserial primary key,
  session_id uuid references sessions(id) on delete cascade,
  section_id text not null,
  markdown text not null default '',
  updated_at timestamptz default now(),
  unique (session_id, section_id)
);
```

**RLS (simple for MVP)**  
- Enable RLS on all tables, add policies allowing `owner_id` or session membership. For speed during MVP, you may temporarily disable RLS while testing, then add policies.

---

## 3) Persist a stable `sessionId` across refresh
**Goal**: one cookie/localStorage value → used everywhere (UI state, API calls, Supabase lookups).

- [x] Add `src/lib/session.ts`:
  ```ts
  // src/lib/session.ts
  import Cookies from "js-cookie";
  import {{ v4 as uuid }} from "uuid";

  const COOKIE = "granted_session_id";
  const TTL_DAYS = 30;

  export function getOrCreateSessionId(): string {
    let id = Cookies.get(COOKIE);
    if (!id) {
      id = uuid();
      Cookies.set(COOKIE, id, {{ expires: TTL_DAYS, sameSite: "lax", path: "/" }});
    }
    // mirror to localStorage for redundancy
    try {{ localStorage.setItem(COOKIE, id); }} catch {{}}
    return id;
  }
  ```

- [x] Patch `Workspace.tsx` to **use the persisted id** (and not re-create randomly):

  ```diff
  - const [sessionId] = useState(() => crypto.randomUUID());
  + import {{ getOrCreateSessionId }} from "@/lib/session";
  + const [sessionId] = useState(getOrCreateSessionId);
  ```

  _This alone stops the reset on refresh; later steps will load previous messages/coverage from Supabase at mount._  
  (Current code creates a new UUID every mount, causing the 0% reset.) fileciteturn0file3

---

## 4) De-duplicate Sources by `href` (or hash), not OpenAI file id
- [x] Change the client-side dedupe in `Workspace.tsx` to prefer `source.href || source.label`:

  ```diff
  - const dedupe = new Map<string, SourceAttachment>();
  - [...prev, ...nextSources].forEach((source) => {{ dedupe.set(source.id, source); }});
  + const dedupe = new Map<string, SourceAttachment>();
  + const keyOf = (s: SourceAttachment) => (s.href?.toLowerCase() || s.label.toLowerCase());
  + [...prev, ...nextSources].forEach((s) => dedupe.set(keyOf(s), s));
  ```

  Rationale: `ingestFromUrls` always creates a **new** OpenAI file id on each import even for the same URL — deduping by `id` won’t work. fileciteturn0file3

- [ ] Optionally compute a content hash server-side (future-proofing) and store in `sources.content_sha256` for stronger dedupe.

---

## 5) Make Drag‑and‑Drop + File Upload actually work
- [x] Add a **drop target + file input** to the composer (in `Chat` component) and POST to `/api/upload` with `sessionId` and each file.

  Example handler (client):
  ```ts
  async function uploadFiles(files: File[]) {{
    const data = new FormData();
    data.append("sessionId", sessionId);
    for (const f of files) data.append("files", f);
    const res = await fetch("/api/upload", {{ method: "POST", body: data }});
    if (!res.ok) throw new Error("Upload failed");
    const json = await res.json();
    onSourcesUpdate?.((prev) => [...prev, ...json.sources]); // UI rail
    // Optional: immediately ask agent to re-normalize coverage after new sources
    await runAgentTool("normalize_rfp", {{ sessionId }});
    await runAgentTool("coverage_and_next", {{ sessionId }});
  }}
  ```

- [x] Wire `onDrop` and `<input type="file" multiple accept=".pdf,.doc,.docx,.txt">` to `uploadFiles`.

- [ ] Keep the existing `/api/upload` route (works with OpenAI Files + Vector Store). fileciteturn0file3

---

## 6) Reliable URL import
- [x] Keep `/api/import-url` but **normalize filename based on Content‑Type** and pass a friendly label (e.g., `solicitation.html`). Ensure it returns `{{sources}}` (already does). fileciteturn0file3
- [x] After import completes, automatically call `normalize_rfp` + `coverage_and_next` and post an assistant message that explicitly says: “Next: {{slot.label}}. Please provide …”. (Use the Agents SDK turn.)

---

## 7) Persist + reload messages and coverage via Supabase
- [ ] Client boot sequence (in `Workspace` or `Chat`):
  1. Obtain `sessionId` (Step 3).
  2. `GET /api/bootstrap?sessionId=…` → returns: existing session row (or creates it), last 50 messages, latest coverage snapshot, and sources list.
  3. Hydrate UI with that payload.

- [ ] Add `src/app/api/bootstrap/route.ts` (server):
  - Upsert `sessions` (id from cookie)
  - Query `messages` (by session_id, order asc, limit 50)
  - Query latest `coverage_snapshots` (order by created_at desc limit 1)
  - Query `sources` (by session_id)
  - Return JSON payload

- [ ] On every assistant/user message:
  - Insert a `messages` row
  - If coverage changed, insert a snapshot (and update UI state)

- [ ] Minimal server helpers:
  - `src/lib/supa-server.ts` (service role, server-only)
  - `src/lib/supa-client.ts` (anon client for browser reads/writes when safe)

---

## 8) Deterministic Coverage that updates after ingest/drafts
- [ ] Keep `normalizeRfp` + `coverageAndNext` tools but adapt to persist the **snapshot** to Supabase after execution.
  - In each tool’s execute handler, after computing `coverage`, call `saveCoverageSnapshot(sessionId, coverage)` (server helper).
  - Return the `coverage` in the agent envelope so UI updates immediately.
  - Ensure “Fix next” chip always points to the **first non‑complete slot**. (Already implemented by `selectFixNext`.) fileciteturn0file3

- [x] Update `CoveragePanel` click behavior:
  - Add `onSelect(slotId)` prop; when clicked, set `activeSlotId` in `Workspace` and open the editor (Step 9).

---

## 9) Section Editor (when a coverage slot is clicked)
**UX**: Clicking a slot on the right opens a drawer/panel showing:
- Current draft (markdown editor)
- “Remaining items” checklist derived from the slot’s `notes` + rules
- A small chat box (“Ask me for the next 2–3 facts to finish this section”)
- A “Draft this section” button → calls `draft_section` tool

**Implementation**
- [x] Add `src/components/SectionEditor.tsx` with props:
  ```ts
  interface SectionEditorProps {{ sessionId: string; slotId: string; onClose(): void; }}
  ```
- [x] Add `GET /api/draft?sessionId&sectionId` → returns latest `drafts.markdown` or empty string.
- [x] Add `POST /api/draft` to upsert `{{ sessionId, section_id, markdown }}`.
- [x] Wire the “Draft this section” button to call Agents tool `draft_section` with a prompt constructed from known facts (sources, prior answers). Save the returned markdown in `drafts` and reflect in the editor.

---

## 10) “What should I do next?” — make it explicit in chat
- [x] After each coverage update, the assistant posts:  
  **“Coverage {{p}}%: Next focus → {{slot.label}}. Please provide: {{bullet list of data points}}. You can upload a URL or paste the text.”**  
  (This addresses the current ambiguity reported in the screenshots.)

- [x] In the message composer, show **Fix Next chips** (already scaffolded as `FixNextChips.tsx`) that, when clicked, pre-fill the composer with a question/upload ask. fileciteturn0file3

---

## 11) Auth + Grant switcher (simple Supabase Auth)
- [ ] Add Supabase Auth UI (GitHub or magic link) to the header.
- [ ] Add a “Grant” dropdown in the header; default grant created on first visit. Switching grant changes the active `grant_id` and resets/creates a **new session id** bound to that grant.
- [ ] Endpoints to implement:
  - `POST /api/grants` → create {{ name }} and return id
  - `GET /api/grants` → list user’s grants
  - `POST /api/use-grant` → set active grant in a cookie and create a fresh `sessions` row for it if needed

---

## 12) Export DOCX
- Keep `/api/export` and `exportDocx` tool; on success, stream a browser download. Already implemented; ensure the button is present in the UI when coverage has no “missing” slots. fileciteturn0file3

---

## 13) Concrete patches & skeletons

### 13.1 `src/lib/types.ts` (if missing, add a minimal shared shape)
```ts
export type SlotStatus = "missing" | "partial" | "complete";

export interface CoverageSlot {
  id: string;
  label: string;
  status: SlotStatus;
  notes?: string;
}

export interface CoverageSnapshot {
  score: number; summary: string; slots: CoverageSlot[]; updatedAt: number;
}

export interface SourceAttachment {
  id: string;
  label: string;
  kind: "file" | "url";
  href?: string;
}

export interface FixNextSuggestion {
  id: string; label: string; description?: string; kind: "question" | "tighten";
}

export interface ChatMessage { id?: string; role: "user"|"assistant"; content: string; createdAt: number; pending?: boolean; }

export interface AgentRunEnvelope {
  coverage?: CoverageSnapshot;
  fixNext?: FixNextSuggestion | null;
  sources?: SourceAttachment[];
}
```

### 13.2 `src/lib/coverage.ts` (simple scorer used by tools)
```ts
import { CoverageSnapshot, CoverageSlot } from "./types";

export function createCoverageSnapshot(slots: CoverageSlot[], summary = "Coverage initialized"): CoverageSnapshot {
  const complete = slots.filter(s => s.status === "complete").length;
  const total = Math.max(slots.length, 1);
  const score = complete / total;
  return { score, summary, slots, updatedAt: Date.now() };
}
```

### 13.3 `Workspace.tsx` tweaks
- Use stable session id (Step 3)
- Pass `onSelect` to `CoveragePanel` and conditionally render `<SectionEditor />`

### 13.4 `CoveragePanel.tsx` — make slots clickable
```diff
- <li key={slot.id} className={{`coverage-slot coverage-slot--${{slot.status}}`}}>
+ <li key={slot.id} className={{`coverage-slot coverage-slot--${{slot.status}}`}} onClick={() => onSelect?.(slot.id)} role="button">
```

Add to props:
```ts
export interface CoveragePanelProps {
  coverage?: CoverageSnapshot | null;
  onSelect?: (slotId: string) => void;
}
```

### 13.5 `ingestFromUrls.ts` — preserve label + href and return
(Already returns `{{sources}}`; keep as-is. Ensure UI merges by `href/label` instead of `id`.) fileciteturn0file3

---

## 14) Acceptance criteria (must meet before adding any extras)
- [ ] **Refresh persistence**: After importing an RFP URL or PDF and getting assistant replies, a **hard refresh** shows the same assistant messages, coverage %, and sources (no duplicates).
- [x] **Source dedupe**: Re-importing the same URL never creates multiple entries in the Sources rail.
- [x] **Coverage clarity**: After import, chat explicitly says: “Coverage X% → Next focus: _{{slot}}_. Please provide: _{{items}}_.”
- [x] **Drag‑and‑drop**: Dropping a PDF triggers upload, shows it in Sources, and bumps coverage when relevant.
- [ ] **Login + switcher**: I can log in, create/select a Grant, and see separate sessions per grant.
- [x] **Section editor**: Clicking a slot opens a side editor with any existing draft and a clear list of remaining items; “Draft this section” produces/updates text.
- [ ] **DOCX export**: When all required slots are “complete”, the Export button downloads a doc successfully.

---

## 15) Work plan — smallest viable steps in order
1) Persist session id (Step 3) → verify refresh no longer generates a new id.  
2) Add `/api/bootstrap` and hydrate on load → verify older messages & coverage load (manually insert test rows if needed).  
3) Dedupe sources by `href/label` (Step 4) → test re-import.  
4) Implement drag‑and‑drop + `/api/upload` integration (Step 5).  
5) After import, auto-run `normalize_rfp` + `coverage_and_next` and post explicit “what to do next” message (Step 10).  
6) Supabase Auth + Grant switcher (Step 11).  
7) Clickable Coverage → Section Editor (Step 9).  
8) Export DOCX gating on coverage (Step 12).

_Stop here. Ship this as MVP._

---

## 16) Commands
```bash
# dev
pnpm i
pnpm dev

# build locally
pnpm build && pnpm start

# vercel (already configured to deploy from GitHub main)
git push origin main
# Vercel will auto-deploy; ensure env vars set in Vercel project settings
```

---

## 17) Notes on Agents SDK orchestration
- Keep the current server-side tools (`normalize_rfp`, `coverage_and_next`, `draft_section`, `tighten_section`, `export_docx`) and have the agent call them. The UI never manipulates coverage directly; it just renders snapshots from the agent’s envelope. fileciteturn0file3 fileciteturn0file5
- After each tool run, persist into Supabase (`coverage_snapshots`, `drafts`, `messages`), then stream the envelope to the UI.

---

## 18) Risks & mitigations
- **Session/Grant mix-ups** → include both `sessionId` and `grantId` in every DB row and API call; assert both exist server-side.
- **File type quirks** → keep using `Content-Type` from the response when importing URLs; rename to `.html`/`.pdf` for OpenAI Files compatibility (your import route already does this). fileciteturn0file3
- **Overcomplication** → resist adding budgets/timelines; keep the MVP to ingest → coverage → fix next → draft → export.

---

## 19) What’s **in** this Plan relative to your ask
- ✅ Login + choose/create a **grant** (project)
- ✅ Coverage click opens a **section editor** (draft + remaining items + focused Q&A)
- ✅ Persist sessions/data; stop the refresh reset
- ✅ Reliable imports (URL + drag‑drop PDF), dedupe sources
- ✅ Explicit **next action** guidance after every step

If anything is unclear, proceed with the checklist as written — every task is independent and shippable. Focus on Steps 3–6 first to stabilize the core user flow, then add the editor and auth.

---

*Generated: {timestamp}*
