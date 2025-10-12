# Plan8.md — Granted MVP (ship it fast)

**Goal**: Ship a *working* conversational MVP on **Vercel** that lets a user paste/upload RFPs (PDFs + URLs), iteratively collect missing content through chat, and export a first‑draft **DOCX**. *Keep it thin; remove bloat.*

**Hosting**: Deployed to **Vercel** from GitHub. ✔️ (assumed and required)

**Non‑goals for MVP**: Advanced presets, multi‑agent graphs, rich formatting rules, auth/teams, billing. Focus on “one preset, one session, one draft.”

**Definition of Done (DoD)**
- User can: (1) paste a URL or upload PDFs, (2) chat to fill required sections, (3) click **Export DOCX** to download a draft.
- Chat shows “Fix next” cues and a basic **Coverage** panel that updates during the session.
- RFP‑agnostic behavior (no template coupling).
- Deployed to Vercel; cold starts OK.
- No Bubble anywhere; a **thin Next.js + React app** only.

> This plan is written so an AI agent (or a developer) can complete tasks independently, in order. It references the current repo where helpful.


---

## 0) Quick repo assessment (what’s already here, what’s missing)

**Present & good**  
- URL import API, upload API, DOCX export API are already implemented and aligned with our goals. fileciteturn5file2 fileciteturn5file9 fileciteturn5file3  
- Server tools exist for: `normalizeRfp`, `coverageAndNext`, `draftSection`, `tightenSection`, `exportDocx`. These give us deterministic coverage + “fix next” suggestions, drafting stubs, length checks, and DOCX generation. fileciteturn6file4 fileciteturn6file15 fileciteturn6file10 fileciteturn6file7 fileciteturn6file1  
- UI panels for **Coverage** and **Sources** exist. fileciteturn6file7

**Blocking gaps**  
- **`Chat.tsx` is missing** but `Workspace.tsx` imports it; compilation will fail until we add it. fileciteturn4file3  
- **`/api/agent` streaming route** isn’t wired yet (the repo includes a checklist snippet but not the concrete code), so the chat loop can’t run. fileciteturn5file0  
- Several **`lib/*`** modules are referenced (types, openai, agents, vector‑store, coverage helpers, tighten helpers, docx builder, agent‑context) but not all exist yet. These must be created with minimal implementations. (See tasks below.)  
- `app/page.tsx` is marked `"use client"`; move client boundaries to components to avoid hydration/confusion. fileciteturn5file3


---

## 1) Preflight (one‑time)
- [x] Ensure **Node 20** is the runtime (local + Vercel). In API route files, keep `export const runtime = "nodejs";` as already done. fileciteturn5file2  
- [x] Create `.env.local` with `OPENAI_API_KEY`. Add the same key to Vercel Project → **Settings → Environment Variables** (Production + Preview).  
- [x] Verify `vercel.json` or project settings enforce Node runtime and sufficient timeout; add if missing:
  ```json
  {
    "functions": {
      "app/api/**/route.js": { "runtime": "nodejs20.x", "maxDuration": 60 }
    }
  }
  ```


---

## 2) Fix compile blockers (UI + types + minimal libs)

### 2.1 Add `src/components/Chat.tsx` (client component)
- [x] Done
**Why**: `Workspace` renders `<Chat />` but the component is not in the repo. fileciteturn4file3

**What to implement (MVP)**  
- A message list (uses `<Message />`) and composer with: text input, **Upload PDF** button (POST `/api/upload` with `sessionId`), and **Add URL** field (POST `/api/import-url`). fileciteturn5file9 fileciteturn5file2  
- On **Send**, POST to `/api/agent` and **stream** the response (see §3). Update chat and forward envelopes to `onEnvelope` to drive Coverage, Fix‑next, Sources. (Envelope shape in §6.)  
- Show **FixNextChips** above the composer when present; clicking a chip seeds the input.  
- Keep the Chat entirely client‑side; the page/layout stay server components.

> Tip: use `fetch('/api/agent', { method: 'POST', body: JSON.stringify(payload) })` and parse the streaming text via `response.body.getReader()`; do not use `EventSource` for POST.


### 2.2 Create minimal `src/lib/types.ts`
- [x] Done
Define just enough for current UI + tools:
- `ChatMessage` (`id`, `role`, `content`, `createdAt`, `pending?`) used by `<Message />`. fileciteturn4file0  
- `CoverageSnapshot` (score 0–1, summary, `slots[]` with `{ id, label, status: "missing"|"partial"|"complete", notes? }`, `updatedAt`). Used by **CoveragePanel** and tools. fileciteturn6file7  
- `FixNextSuggestion` (`id`, `label`, `description?`, `kind: "question"|"tighten"|"export"`).  
- `SourceAttachment` (`id`, `label`, `kind: "file"|"url"`, `href?`). Used by **SourceRail** and APIs. fileciteturn6file8  
- `TightenSectionSnapshot`, `ProvenanceSnapshot` (small structs used by tools).  
- `AgentRunEnvelope` union that can carry `messageDelta`, `coverage`, `fixNext`, `sources`, `tighten`, `provenance` (see §6).


### 2.3 Create `src/lib/openai.ts`
- [x] Done
- Export **`getOpenAI()`** returning a singleton `new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })`. The API routes and tools already expect this. fileciteturn5file9 fileciteturn6file1  
- (Optional) `import 'undici/polyfill'` to ensure `File`/`Blob` are available on Node 20 during URL ingest.


### 2.4 Create `src/lib/vector-store.ts`
- [x] Done
A tiny in‑memory map from `sessionId → vectorStoreId` + helpers:
- `ensureVectorStore(sessionId: string)`: if missing, create `openai.vectorStores.create({ name: sessionId })` and store the id.  
- `attachFilesToVectorStore(sessionId, fileIds)` uses the stored id and calls `openai.vectorStores.files.create({ vector_store_id: id, file_id })` for each file. These are already used by upload/import APIs. fileciteturn5file9 fileciteturn5file2


### 2.5 Create `src/lib/coverage.ts`
- [x] Done
- Export `createCoverageSnapshot(slots: Slot[], summary?: string)`; the tools call this already. Keep logic minimal (score = completed/total). fileciteturn6file4 fileciteturn6file15


### 2.6 Create `src/lib/tighten.ts`
- [x] Done
- Export `analyzeLength(markdown: string, limitWords?: number)` and return `{ withinLimit, wordCount, pageEstimate }`. Used by `tightenSection`. fileciteturn6file7


### 2.7 Create `src/lib/docx.ts`
- [x] Done
- Export `buildDocx({ markdown, filename? })` using the `docx` package; the server tool already expects it. Keep mapping paragraph‑by‑paragraph for MVP. fileciteturn6file1


### 2.8 Create `src/lib/agent-context.ts`
- [x] Done
- Define `export interface GrantAgentContext { sessionId: string; vectorStoreId?: string; coverage?: CoverageSnapshot; fixNext?: FixNextSuggestion; sources?: SourceAttachment[]; tighten?: TightenSectionSnapshot; provenance?: ProvenanceSnapshot; }` to let tools stash updates in memory across a single run.


### 2.9 Make `app/page.tsx` a **server** component
- [x] Done
- Remove `"use client"` from `app/page.tsx`; it should render `<Workspace />` which is a client component. fileciteturn5file3


---

## 3) Wire the agent run (server) — `/app/api/agent/route.ts`
- [x] Done

**Goal**: Accept `{ sessionId, message, urls?, fileIds? }`, guarantee a vector store for the session, create a Grant Agent, and **stream** output back to the client as newline‑delimited JSON envelopes (not EventSource).

**Implement (POST)**  
- Ensure vector store for `sessionId` via `ensureVectorStore(sessionId)`; stash it in the agent context.  
- `createGrantAgent(vectorStoreId)` returns an Agent with File Search + tools (see §4).  
- Call `agent.runStream(message)` and wrap its stream into a `ReadableStream` that emits our `AgentRunEnvelope` records (see §6). fileciteturn5file0

> Keep the payload simple: emit envelopes for `messageDelta` and for each tool result (`coverage`, `fixNext`, `sources`, `tighten`, `provenance`).


---

## 4) Create `src/lib/agents.ts` (Grant Assistant wiring)
- [x] Done

- Use the **OpenAI Agents SDK** with File Search and Web Search (allowed per requirements). Register our server tools: `ingestFromUrls`, `normalizeRfp`, `coverageAndNext`, `draftSection`, `tightenSection`, `exportDocx`. The repo already shows the intended wiring pattern—convert that snippet into code. fileciteturn6file13  
- The agent instructions should enforce: *RFP‑agnostic flow*, coverage tracking, and asking for exactly **one next item** (“Fix next”) per turn.  
- Pass `vectorStoreId` to the `fileSearchTool`.


---

## 5) Finish client chat loop (`Chat.tsx` details)
- [x] Done

- [x] Maintain `messages` (array of `ChatMessage`) and render `<Message />`. fileciteturn4file0  
- [x] On **Send**: append a pending user message, start `fetch('/api/agent')`, stream chunks; for each JSON line:
  - If `{ messageDelta }` append/merge into the assistant’s pending bubble; when `done`, clear `pending`.
  - If `{ coverage | fixNext | sources | tighten | provenance }`, call `props.onEnvelope(envelope)` (Workspace already wires this to panels). fileciteturn4file3  
- [x] **Upload PDFs** via `/api/upload` (multipart with `sessionId`). Append returned `sources` to the Source rail; no page reload. fileciteturn5file9  
- [x] **Add URL(s)** via `/api/import-url` with `sessionId`; merge returned `sources`. fileciteturn5file2  
- [x] If a `FixNext` chip is present with `kind: "export"`, call `/api/export` with current assembled markdown and trigger a file download. fileciteturn5file3


---

## 6) Envelope protocol (server ↔ client)
- [x] Done

The server emits **newline‑delimited JSON** envelopes; the client merges them.

```ts
type AgentRunEnvelope =
  | { type: "message", delta: string, done?: boolean }  // assistant text stream
  | { type: "coverage", coverage: CoverageSnapshot }
  | { type: "fixNext", fixNext: FixNextSuggestion | null }
  | { type: "sources", sources: SourceAttachment[] }     // append/merge by id
  | { type: "tighten", tighten: TightenSectionSnapshot | null }
  | { type: "provenance", provenance: ProvenanceSnapshot | null };
```

> On the server, when a tool finishes (e.g. `coverageAndNext`), immediately emit its object as one envelope so the UI updates mid‑turn. Tools in this repo already compute the right shapes. fileciteturn6file15 fileciteturn6file4 fileciteturn6file7 fileciteturn6file1


---

## 7) Minimal instructions (one preset, RFP‑agnostic)
- [x] Done

Add these to the agent system prompt (or agent config):

- “You are the **Grant Assistant**. Goal: produce a solid first draft by asking for **one** missing item at a time.”  
- “Always consult **File Search** for anything in RFP or uploaded/bound URLs. If missing, ask for it.”  
- “Maintain a coverage map of required sections and call tools to update `coverage` and `fixNext` after each step.”  
- “If limits are tight, call `tightenSection` before final export.”  
- “Cite short provenance tags inline like `[RFP]`, `[ORG]`, `[BIO: Name]`.”

This aligns with the tools already included. fileciteturn6file13


---

## 8) Smoke test locally
- [ ] `pnpm dev` → open `/` and verify the app renders (no missing imports).  
- [ ] Paste a public RFP PDF URL into **Add URL** → expect new items in **Sources** rail. fileciteturn5file2  
- [ ] Type “Summarize key requirements and tell me what to provide next” → watch assistant stream + Coverage update + FixNext chip. fileciteturn6file15  
- [ ] Upload a short PDF resume/CV → expect **Sources** to increment. fileciteturn5file9  
- [ ] Click **Export DOCX** when “Fix next” suggests export → file downloads. fileciteturn5file3


---

## 9) Deploy to Vercel
- [x] Push to GitHub (main). Connect the repo in Vercel.  
- [x] Set `OPENAI_API_KEY` in Vercel **Production** and **Preview**.
- [x] Trigger a deploy; validate API routes (`/api/health`, `/api/import-url`, `/api/upload`, `/api/export`) respond OK. fileciteturn5file6 fileciteturn5file2 fileciteturn5file9 fileciteturn5file3


---

## 10) Post‑deploy hardening (still simple)
- [ ] Limit uploads by size/type in `/api/upload` (basic checks). fileciteturn5file9  
- [ ] Add `try/catch` and user‑visible error to Chat when `/api/agent` fails.  
- [ ] In `next.config.js`, ensure no restrictive `serverActions.allowedOrigins` that would block production domain.  
- [ ] Log agent/tool errors to Vercel logs (redact user content only if/when privacy matters later).


---

## Appendix A — Files to add (paths & stubs)

> Create these with the minimal code implied above; they are already referenced across the repo.

- [x] `src/components/Chat.tsx` — chat stream UI (composer + list + URL import + upload) that posts to `/api/agent`. fileciteturn4file3  
- [x] `src/app/api/agent/route.ts` — POST streaming route using Agents SDK. fileciteturn5file0  
- [x] `src/lib/types.ts` — shared shapes for UI + tools. fileciteturn4file0 fileciteturn6file7  
- [x] `src/lib/openai.ts` — `getOpenAI()` singleton. fileciteturn5file9  
- [x] `src/lib/vector-store.ts` — `ensureVectorStore`, `attachFilesToVectorStore`. fileciteturn5file9 fileciteturn5file2  
- [x] `src/lib/coverage.ts` — `createCoverageSnapshot`. fileciteturn6file4 fileciteturn6file15  
- [x] `src/lib/tighten.ts` — `analyzeLength`. fileciteturn6file7  
- [x] `src/lib/docx.ts` — `buildDocx`. fileciteturn6file1  
- [x] `src/lib/agent-context.ts` — run‑scoped context interface.  
- [x] `src/lib/agents.ts` — `createGrantAgent(vectorStoreId)` with File Search + tools. fileciteturn6file13


---

## Appendix B — “Fix Next” default (content‑agnostic)
For the very first turns (no RFP parsed yet), default `coverageAndNext` to these slots so we’re never stuck:
- `Project narrative (missing)` — ask for program overview, goals, beneficiaries.  
- `Organizational capacity (partial)` — ask for org summary + key bios URLs.  
- When all slots are `complete`, suggest **Export a DOCX draft**. The tool already encodes this behavior. fileciteturn6file15


---

## Appendix C — Why we **don’t** add more now
- No auth, no presigned uploads, no multi‑session persistence. Those can wait until the chat loop and export prove out.  
- We don’t over‑engineer the agent hierarchy; one agent + a few tools is enough for MVP.  
- We keep the UI minimal (Workspace + Chat + Coverage + Sources) and avoid any extra layout libraries.

---

**Outcome**: Follow this checklist and you’ll land a working, RFP‑agnostic, Vercel‑hosted MVP that imports PDFs/URLs and exports DOCX with a conversational flow—no Bubble, minimal surface area, easy to extend.
