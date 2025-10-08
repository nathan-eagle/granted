# AgentKit Notes (Rev 4 → Rev 5 transition)

_Last updated: 2025-10-07T14:43Z_

> **Rev5 prototype note:** ChatKit embedding is paused. Keep references below for historical context but prefer Agents SDK endpoints + code-driven sessions going forward.

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

## (Archived) ChatKit specifics
- The Rev4 workspace used `@openai/chatkit-react` and hosted sessions. Rev5 removes this dependency in favor of code-only Agents SDK flows.

## Local toolchain state (2025-10-07)
- Installed `@openai/agents@0.1.9` (serves as interim AgentKit SDK until dedicated package ships).
- Installed `@openai/chatkit-react@0.0.0` (embeddable workspace components; awaiting formal release notes for additional widgets/peer deps).
- Added npm scripts:
  - `agentkit:pull` / `agentkit:push` — currently placeholders that remind devs to document workflow syncs pending official CLI.
  - `agentkit:types` — snapshots `@openai/agents` type definitions into `types/generated/agentkit/index.d.ts` for stable imports.
  - `chatkit:devtool` — placeholder guidance to use hosted ChatKit playground until CLI is published.
- `agentkit:check` — validates required env vars and, once AgentKit project endpoints are public, will GET `/agentkit/projects/:id`. For now run with `AGENTKIT_CHECK_SKIP_NETWORK=1`.
- Generated initial type snapshot at `web/types/generated/agentkit/index.d.ts`.

## Provisioning tracker
- **AgentKit workflow**: `wf_68e537c4e69881908e65357e36a28f3c08492e7f3aee14b4` (Rev‑4 stub created in Agent Builder on 2025‑10‑07). Expose as `AGENTKIT_WORKFLOW_ID`.
- **AgentKit project ID**: _TBD_ — blocked on dashboard access; once issued, update `.env`, Vercel envs, and rerun `npm run agentkit:check` without the skip flag.

## Follow-ups / open questions
- Need direct **AgentKit Quickstart** once published to capture CLI commands, schema sync workflows, and any `@openai/agentkit` package usage.
- Confirm **retention + scope settings** inside dashboard (screenshot + doc) when AgentKit project created.
- Identify **eval tooling endpoints** (datasets, trace grading, prompt optimizer) for automation scripts.
- Provision AgentKit project `granted-ux4`; update the engineering runbook and Vercel envs when OpenAI dashboard access is available.
- See `docs/agents-sdk-prototype.md` for the Rev5 API-first architecture summary and backlog.
