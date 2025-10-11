
# Plan7 — **Conversational Grant MVP (RFP‑agnostic)**
**Host:** Vercel (GitHub → auto‑deploy)  
**Front‑end:** Next.js (App Router, React)  
**Backend:** Next.js Route Handlers (Node.js runtime)  
**AI Orchestration:** OpenAI **Agents SDK** for TypeScript with **File Search** (Vector Stores) and **Web Search** tools  
**Exports:** DOCX (one preset)  
**Inputs:** User can upload **PDFs** _and_ submit **URLs** for RFPs, org profiles, bios, CVs, resumes, etc.  
**UX:** Single conversational workspace with **Fix‑next** loop, **Coverage** panel, and **Tighten** for limits

> This checklist is designed so an AI agent (or a dev) can follow it step‑by‑step and land a working MVP on Vercel from a brand‑new repo.

---

## 0) Preflight
- [x] **Confirm hosting**: We are deploying on **Vercel**. Use GitHub repo with automatic deployments from `main`.
- [x] **Local runtime**: Node.js **v20+** (required for Web Streams/Blob); package manager **pnpm** (preferred) or npm.
- [ ] **OpenAI credentials**: Obtain `OPENAI_API_KEY`. (Organization/project scoped key is fine.)
- [x] **Decide model**: Use a GPT‑5 class model: 'gpt-5'. 

---

## 1) Initialize a fresh repo
- [x] We are using a fresh, main branch of **public GitHub repo** `granted`.
- [x] Initialize Next.js (App Router) with TypeScript:
  ```bash
  pnpm dlx create-next-app@latest granted-mvp \
    --ts --eslint --app --src-dir --import-alias "@/*" --no-tailwind
  cd granted-mvp
  pnpm add -D prettier @types/node
  ```
- [x] Opt into **Node.js runtime** by default for API routes (needed for file uploads + DOCX generation).

---

## 2) Add core dependencies
- [x] Add OpenAI + Agents SDK + validation + DOCX:
  ```bash
  pnpm add openai @openai/agents @openai/agents-openai zod docx undici
  ```
  - `@openai/agents` + `@openai/agents-openai`: Agents SDK (TypeScript).  
  - `openai`: Official Node client (used by the Agents SDK and file/vector APIs).  
  - `zod`: Small schema checks for tool I/O.  
  - `docx`: Generate DOCX in serverless.  
  - `undici`: Node fetch / Blob / File polyfills where needed.
- [x] (Optional) UI libs: `pnpm add clsx` (class merging), `react-markdown` for draft preview.

---

## 3) Repository skeleton (create these files/folders)

```
granted-mvp/
├─ app/
│  ├─ layout.tsx
│  ├─ page.tsx                      # Chat workspace (UI)
│  └─ api/
│     ├─ agent/route.ts             # Start/continue an agent run (SSE stream)
│     ├─ upload/route.ts            # Upload PDFs (multipart) → OpenAI Files → Vector Store
│     ├─ import-url/route.ts        # Import any URL (RFP, org site, CV, etc.) → OpenAI Files
│     ├─ export/route.ts            # Generate and return a DOCX
│     └─ health/route.ts            # Simple healthcheck
├─ components/
│  ├─ Chat.tsx
│  ├─ Message.tsx
│  ├─ FixNextChips.tsx
│  ├─ CoveragePanel.tsx
│  └─ SourceRail.tsx
├─ lib/
│  ├─ openai.ts                     # OpenAI client singleton
│  ├─ agents.ts                     # Agent instance + tools wiring
│  ├─ vector-store.ts               # Create/attach vector stores
│  ├─ rfp-norm.ts                   # Types + helpers for RFP-NORM v1
│  ├─ coverage.ts                   # Coverage scoring + Fix-next selection
│  ├─ tighten.ts                    # Word/page limit simulator & tightening
│  └─ docx.ts                       # DOCX builder from markdown-ish input
├─ server/tools/
│  ├─ ingestFromUrls.ts             # Download URLs → Files API → Vector Store
│  ├─ normalizeRfp.ts               # Build RFP-NORM v1 from File Search
│  ├─ draftSection.ts               # Slot-based drafter (delegates reasoning to agent)
│  ├─ coverageAndNext.ts            # Deterministic coverage map + next question
│  ├─ tightenSection.ts             # Rewrite to respect limits preset
│  └─ exportDocx.ts                 # Generate DOCX, return file buffer
├─ public/
│  └─ favicon.ico
├─ .env.example
├─ vercel.json
├─ next.config.js
├─ package.json
└─ README.md
```

---

## 4) Environment & Vercel config
- [x] Create `.env.local` (never commit) and `.env.example`:
  ```env
  OPENAI_API_KEY=sk-...
  # Optional: OPENAI_ORG=...
  # Optional: NEXT_PUBLIC_APP_NAME=Granted MVP
  ```
- [x] Add `vercel.json` to enforce **Node runtime** for API and increase function limits if needed:
  ```json
  {
    "functions": {
      "app/api/**/route.js": { "runtime": "nodejs20.x", "maxDuration": 60 }
    }
  }
  ```
- [ ] In **Vercel Dashboard → Settings → Environment Variables**, add `OPENAI_API_KEY` for **Production** and **Preview**.
- [ ] Push to GitHub; connect the repo in Vercel; enable **auto‑deploy** on push to `main`.

---

## 5) Implement OpenAI client & Agents SDK wiring
- [x] `lib/openai.ts` — instantiate clients:
  ```ts
  import OpenAI from "openai";
  export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  ```
- [x] `lib/agents.ts` — define a single **Grant Assistant** with tools:
  ```ts
  import { Agent, tool, run } from "@openai/agents";
  import { OpenAIProvider, fileSearchTool, webSearchTool, setDefaultOpenAIKey } from "@openai/agents-openai";
  import { z } from "zod";
  setDefaultOpenAIKey(process.env.OPENAI_API_KEY!);

  // Server tools (wrapping functions below)
  import { ingestFromUrls } from "@/server/tools/ingestFromUrls";
  import { normalizeRfp } from "@/server/tools/normalizeRfp";
  import { coverageAndNext } from "@/server/tools/coverageAndNext";
  import { draftSection } from "@/server/tools/draftSection";
  import { tightenSection } from "@/server/tools/tightenSection";
  import { exportDocx } from "@/server/tools/exportDocx";

  // Create the agent with File Search + Web Search enabled.
  export function createGrantAgent(vectorStoreId?: string) {
    return new Agent({
      name: "Grant Assistant",
      instructions: [
        "You help users draft compliant grants via one conversation.",
        "Always use File Search for anything in the RFP or user-provided files.",
        "Maintain a coverage map (required slots) and propose one 'Fix next' chip at a time.",
        "Cite sources inline with short provenance tags [RFP], [ORG], [BIO:<name>].",
        "Respect length/formatting limits; call tightenSection when overflow is predicted."
      ].join(" "),
      model: new OpenAIProvider().responsesModel(), // use Responses API via Agents SDK
      tools: [
        fileSearchTool({ vectorStoreId }), // attaches OpenAI Vector Store
        webSearchTool(),                   // allowed at this stage per requirements
        tool(ingestFromUrls),
        tool(normalizeRfp),
        tool(coverageAndNext),
        tool(draftSection),
        tool(tightenSection),
        tool(exportDocx)
      ]
    });
  }
  ```

> References: Agents SDK for TypeScript, tools like `fileSearchTool` and `webSearchTool` exist in `@openai/agents-openai`. The SDK provides a built‑in agent loop and streaming. See docs during implementation.

---

## 6) Vector Store helpers (File Search)
- [x] `lib/vector-store.ts`
  ```ts
  import { openai } from "./openai";

  export async function ensureVectorStore(name: string) {
    const vs = await openai.vectorStores.create({ name });
    return vs.id;
  }

  export async function addFilesToVectorStore(vectorStoreId: string, fileIds: string[]) {
    // Attach uploaded files to the store
    for (const fileId of fileIds) {
      await openai.vectorStores.files.create({ vector_store_id: vectorStoreId, file_id: fileId });
    }
  }
  ```
- [x] Notes:
  - Create **one vector store per chat session**.
  - Use it as the data source for the agent’s `fileSearchTool`.
  - All URLs/files the user provides go into the same store.

---

## 7) Server tools (minimal, production‑ready)

### 7.1 `server/tools/ingestFromUrls.ts`
- [x] Implement a function that accepts `{ urls: string[] }` and returns `{ fileIds: string[] }`:
  ```ts
  import { z } from "zod";
  import { openai } from "@/lib/openai";

  export const ingestFromUrls = {
    name: "ingestFromUrls",
    description: "Fetch one or more URLs (PDF/HTML/DOCX/etc.), upload to OpenAI Files for File Search.",
    parameters: z.object({ urls: z.array(z.string().url()).min(1) }),
    execute: async ({ urls }: { urls: string[] }) => {
      const ids: string[] = [];
      for (const url of urls) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch: ${url}`);
        const blob = await res.blob();
        const fname = decodeURIComponent(new URL(url).pathname.split("/").pop() || "source");
        const file = new File([blob], fname, { type: blob.type || "application/octet-stream" });
        const up = await openai.files.create({ file/* Blob|File */, purpose: "assistants" });
        ids.push(up.id);
      }
      return { fileIds: ids };
    }
  };
  ```
  - _Why Files API?_ We avoid server disk usage; Vercel’s FS is ephemeral. Files go straight to OpenAI Files & Vector Stores.

### 7.2 `server/tools/normalizeRfp.ts`
- [x] Build **RFP‑NORM v1**: extract sections, limits (page/word + formatting), eligibility, attachments, and rubric from File Search results.
  ```ts
  import { z } from "zod";
  export const normalizeRfp = {
    name: "normalizeRfp",
    description: "Build an RFP-NORM v1 object from the ingested RFP bundle using File Search.",
    parameters: z.object({}),
    execute: async () => {
      // The agent will call File Search in its prompt to extract details.
      // Return a placeholder shape; the agent fills and returns concrete values.
      return { ok: true };
    }
  };
  ```

### 7.3 `server/tools/coverageAndNext.ts`
- [x] Minimal deterministic scoring + next chip:
  ```ts
  import { z } from "zod";
  const SLOTS = ["problem","beneficiaries","innovation","prior_results","approach","milestones","risks","evaluation","team","facilities","budget_justification","impact","commercialization"] as const;
  type Slot = typeof SLOTS[number];

  export const coverageAndNext = {
    name: "coverageAndNext",
    description: "Score coverage and suggest the single best next question/upload request.",
    parameters: z.object({
      evidence: z.record(z.string(), z.object({ text: z.string().optional(), sources: z.array(z.string()).optional() })).default({})
    }),
    execute: async ({ evidence }: { evidence: Record<string, {text?: string; sources?: string[]}> }) => {
      const coverage = Object.fromEntries(SLOTS.map(s => [s, evidence[s]?.sources?.length ? "evidenced" : evidence[s] ? "stub" : "missing"]));
      const next = SLOTS.find(s => coverage[s] === "missing") ?? SLOTS.find(s => coverage[s] === "stub") ?? SLOTS[0];
      return { coverage, next: { slot: next, question: `Please provide details or a URL/file for **${next}**.` } };
    }
  };
  ```

### 7.4 `server/tools/draftSection.ts`
- [x] Shape the drafting call; the agent writes content with citations:
  ```ts
  import { z } from "zod";
  export const draftSection = {
    name: "draftSection",
    description: "Draft a specific section using File Search citations and provided evidence.",
    parameters: z.object({ section: z.string(), rfpNorm: z.any(), evidence: z.any() }),
    execute: async () => ({ ok: true })
  };
  ```

### 7.5 `server/tools/tightenSection.ts`
- [x] Tighten to limits preset:
  ```ts
  import { z } from "zod";
  export const tightenSection = {
    name: "tightenSection",
    description: "Tighten markdown to respect word/page limits (preset formatting).",
    parameters: z.object({ section: z.string(), markdown: z.string(), limit: z.object({ words: z.number().nullable(), pages: z.number().nullable() }) }),
    execute: async ({ markdown }) => ({ markdown })
  };
  ```

### 7.6 `server/tools/exportDocx.ts`
- [x] Generate DOCX and return a download path or a base64 buffer:
  ```ts
  import { z } from "zod";
  import { Document, Packer, Paragraph, TextRun } from "docx";

  export const exportDocx = {
    name: "exportDocx",
    description: "Render the current draft into a styled DOCX.",
    parameters: z.object({ markdown: z.string(), filename: z.string().default("grant-draft.docx") }),
    execute: async ({ markdown, filename }) => {
      // Minimal: convert paragraph-by-paragraph (later: richer markdown → DOCX mapping).
      const doc = new Document({ sections: [{ properties: {}, children: markdown.split("\n\n").map(p => new Paragraph({ children: [new TextRun(p)] })) }] });
      const buffer = await Packer.toBuffer(doc);
      // Return base64; the /api/export route can set proper headers for download
      return { filename, base64: Buffer.from(buffer).toString("base64") };
    }
  };
  ```

---

## 8) Route Handlers (API) — Node runtime

### 8.1 `/app/api/agent/route.ts` — run the agent and **stream** output
- [ ] Implement a POST handler that accepts `{ message, urls?, fileIds?, sessionId? }`:
  ```ts
  import { NextRequest } from "next/server";
  import { createGrantAgent } from "@/lib/agents";
  import { ensureVectorStore, addFilesToVectorStore } from "@/lib/vector-store";

  export const runtime = "nodejs";

  export async function POST(req: NextRequest) {
    const { message, urls = [], fileIds = [], sessionId } = await req.json();
    const vectorStoreId = await ensureVectorStore(`rfp-session-${sessionId ?? Date.now()}`);

    // If URLs were provided, let the agent call ingestFromUrls tool itself; or pre‑ingest here and attach:
    // (Optional pre‑ingest) await addFilesToVectorStore(vectorStoreId, <uploaded ids>)

    const agent = createGrantAgent(vectorStoreId);

    // Agents SDK: stream the run as Server-Sent Events
    const { stream, result } = await agent.runStream(message);
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive"
      }
    });
  }
  ```
- [x] The client consumes with `EventSource` and renders deltas live.

### 8.2 `/app/api/upload/route.ts` — accept **PDF** uploads and push to Files API
- [x] Implement a multipart handler (`formData()`) → `openai.files.create` → return `{ fileId }`.
- [x] Attach resulting `fileId` to the current session’s Vector Store.

### 8.3 `/app/api/import-url/route.ts` — import arbitrary URLs
- [x] POST `{ urls: string[] }` → call **ingestFromUrls** tool (or duplicate logic) → return `{ fileIds }`.

### 8.4 `/app/api/export/route.ts` — download a DOCX
- [x] POST `{ markdown, filename? }` → call **exportDocx** → return a binary response:
  ```ts
  export async function POST(req: Request) {
    const { markdown, filename = "grant-draft.docx" } = await req.json();
    // call exportDocx.execute(...) or docx.ts helper
    const { base64 } = await exportDocx.execute({ markdown, filename });
    const buf = Buffer.from(base64, "base64");
    return new Response(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    });
  }
  ```

### 8.5 `/app/api/health/route.ts`
- [x] Return `{ ok: true }` for uptime checks.

---

## 9) UI — one screen, conversation‑first (minimal)
- [x] `app/page.tsx` renders: center chat stream, right **CoveragePanel**, left **SourceRail**.
- [x] `components/Chat.tsx`
  - A message list + input box + **“Fix‑next” chips** from server events.
  - Supports file uploads (PDF) and URL paste for RFP, bios, resumes, org site.
  - Uses `EventSource("/api/agent")` to render streaming tokens.
- [x] `components/CoveragePanel.tsx`
  - Renders slot coverage as simple badges/bars. Clicking a slot focuses the chat to ask for missing info.
- [x] `components/SourceRail.tsx`
  - Shows attached files and imported URLs; clicking jumps to citations in the draft (future).

---

## 10) **One preset** for limits/compliance
- [x] Use the following default formatting for simulation and tightening:
  - **Font**: Times New Roman, **12 pt**
  - **Margins**: 1″ all sides
  - **Spacing**: single
  - **Page calc**: 550 words/page heuristic (tweak later)
- [x] `lib/tighten.ts` — return `{ withinLimit: boolean, wordCount, pageEstimate }`. If overflow, call `tightenSection` tool from the agent.

---

## 11) Default conversation policy
- [ ] On first message after ingest, the agent posts a **Summary** and a **Coverage** map.
- [ ] Every turn includes exactly **one** **Fix‑next** suggestion (question or upload/URL ask).
- [ ] Use **File Search** for any RFP lookup; use **Web Search** when RFP/NORM is unclear or RFP points externally.
- [ ] Keep provenance tags on paragraphs: `[RFP]`, `[ORG]`, `[BIO:Jane]`.

---

## 12) Observability (light)
- [x] Log per run: `coverageScore`, `tightenCompliance`, `% paragraphs with provenance`.
- [x] Console tracing from the Agents SDK (enable when `NODE_ENV !== "production"`).

---

## 13) Build & deploy
- [x] Commit and push to GitHub `main`.
- [ ] In Vercel, ensure project is linked and env vars set (`OPENAI_API_KEY`).
- [ ] Trigger a deploy; verify routes:
  - `GET /api/health` → `{ ok: true }`
  - `POST /api/import-url` with a PDF URL → returns `{ fileIds }`
  - `POST /api/agent` with `{ message: "Start drafting with this RFP" }` streams tokens.
  - `POST /api/export` with `{ markdown }` downloads a `.docx` file.

---

## 14) Acceptance checks (MVP)
- [ ] User can **upload PDFs** and **paste URLs** for **all** needed files.
- [ ] Agent ingests bundle → **RFP‑NORM** is created (at least: sections + limits + attachments + eligibility).
- [ ] A **first streamed summary** appears quickly; coverage increases as the user responds.
- [ ] **Fix‑next** chips are always present and actionable.
- [ ] **Tighten** keeps sections within preset limits.
- [ ] **Export** produces a clean DOCX.

---

## 15) Stretch (post‑MVP; keep behind flags)
- [ ] Conflict Log (when multi‑doc RFPs disagree).
- [ ] Sources appendix in DOCX.
- [ ] Multi‑session persistence (Postgres/Drizzle) for org facts.
- [ ] Fine‑grained word/page simulation by font metrics.
- [ ] Reviewer rubric weighting in `coverage.ts` when RFP provides one.

---

## 16) Notes & caveats for the implementer
- Use **Node runtime** for API routes (Vercel **Edge** has small bundle limits and fewer Node APIs).
- Do **not** write to disk; use **OpenAI Files** and **Vector Stores** for ingestion and search.
- Streaming uses **SSE**; Next.js Route Handlers with `Response(stream, headers)` is supported on Node runtime.
- For HTML URLs, rely on the model + File Search; for PDFs/DOCX, uploading the binary gives best results.
- Treat every chat as its own **Vector Store**; destroy after export if desired.

---

## 17) Commands cheat‑sheet
```bash
# dev
pnpm dev

# format
pnpm dlx prettier --write .

# env
cp .env.example .env.local  # then paste OPENAI_API_KEY

# deploy (push to GitHub main)
git add . && git commit -m "Plan7 scaffold" && git push origin main
```
