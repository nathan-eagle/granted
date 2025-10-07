# AgentKit / ChatKit Notes (Rev 4)

_Last updated: 2025-10-07T14:43Z_

## Primary sources reviewed
- [Introducing AgentKit](https://openai.com/index/introducing-agentkit/) — launch overview retrieved via r.jina.ai mirror.
- [Agent Builder guide](https://platform.openai.com/docs/guides/agent-builder) — visual workflow composition details.
- [ChatKit guide](https://platform.openai.com/docs/guides/chatkit) — embedding instructions, SDK packages, session flow.
- [Developer quickstart](https://platform.openai.com/docs/quickstart/agentkit) — SDK install commands, responses API usage, pointers to Agents SDK for JS/Python.

## AgentKit takeaways
- **Toolkit scope:** Combines Agent Builder (visual workflow designer), Connector Registry (centralized data/tool governance), ChatKit (embeddable chat UI), expanded eval tooling, and reinforcement fine-tuning enhancements.
- **Workflow model:** Workflows are versioned artifacts built in Agent Builder. Deployment options include OpenAI-hosted (ChatKit) or exporting Agents SDK code.
- **Connector Registry:** Admins manage connectors (Dropbox, Google Drive, SharePoint, Teams, third-party MCPs) centrally. Requires Global Admin Console.
- **Guardrails integration:** Optional safety layer (OpenAI Guardrails JS/Python) for prompt/PII filtering.
- **Pricing:** All tooling (Agent Builder, Connector Registry, ChatKit, new evals) included under existing API pricing tiers; no additional SKU announced.
- **Retention defaults:** Launch post reiterates standard API retention (no change stated). Need to confirm per org policy (≤30 days) when configuring project.
- **Required scopes:** Expect API key with access to Agents/ChatKit endpoints plus Connector management via Global Admin. Exact scope list not in public notes; follow up in dashboard when provisioning service tokens.
- **CLI / SDK mentions:** Agents SDK still leveraged (Responses API foundation). Quickstart references `@openai/agents` (JS) and `openai-agents-python` packages. Dedicated AgentKit CLI was not documented; expect configuration via dashboard + SDKs.

## ChatKit specifics
- **Packages:** `@openai/chatkit-react`, optional ChatKit JS script via CDN (`https://cdn.platform.openai.com/deployments/chatkit/chatkit.js`), backend session creation via OpenAI Python or JS SDK.
- **Session flow:** Backend endpoint calls `openai.chatkit.sessions.create` to mint `client_secret`. Frontend fetches secret via `/api/chatkit/session` and passes into `useChatKit` control hook.
- **Embedding:** `<ChatKit control={...} />` renders widget; theming and layout via props and theming docs.
- **Integration path:** Create workflow in Agent Builder → host via OpenAI → embed ChatKit referencing workflow ID. Advanced option: self-host ChatKit + Agents SDK.

## Local toolchain state (2025-10-07)
- Installed `@openai/agents@0.1.9` (serves as interim AgentKit SDK until dedicated package ships).
- Installed `@openai/chatkit-react@0.0.0` (embeddable workspace components; awaiting formal release notes for additional widgets/peer deps).
- Added npm scripts:
  - `agentkit:pull` / `agentkit:push` — currently placeholders that remind devs to document workflow syncs pending official CLI.
  - `agentkit:types` — snapshots `@openai/agents` type definitions into `types/generated/agentkit/index.d.ts` for stable imports.
  - `chatkit:devtool` — placeholder guidance to use hosted ChatKit playground until CLI is published.
- Generated initial type snapshot at `web/types/generated/agentkit/index.d.ts`.

## Follow-ups / open questions
- Need direct **AgentKit Quickstart** once published to capture CLI commands, schema sync workflows, and any `@openai/agentkit` package usage.
- Confirm **retention + scope settings** inside dashboard (screenshot + doc) when AgentKit project created.
- Identify **eval tooling endpoints** (datasets, trace grading, prompt optimizer) for automation scripts.
