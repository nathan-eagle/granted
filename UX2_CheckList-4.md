# UX2_CheckList-4.md — AgentKit/ChatKit (Rev 4: end-to-end production rollout)

> **Objective:** Graduate from simulated AgentKit/ChatKit usage to a fully hosted runtime + ChatKit UI, with each milestone shipping cleanly to Vercel before advancing. Every section ends with `git push` + Vercel deploy verification.

---

## 0) Research & alignment
- [x] Read the **AgentKit launch post** and **AgentKit Quickstart**. Capture CLI/package names, required scopes, retention defaults, and pricing callouts in `docs/agentkit-notes.md`. *(Notes mirrored via r.jina.ai fetch in `docs/agentkit-notes.md`.)*
- [x] Read the **ChatKit workspace guide** and component API docs. Record required providers, hooks, and layout guidelines in the same notes file. *(See ChatKit embedding details captured in `docs/agentkit-notes.md`.)*
- [x] Sync with Product/Support on Rev‑4 scope (multi-doc bundles, compliance simulator, Fix-next, eligibility gating, eval gates) to confirm no new requirements. *(See `docs/rev4-stakeholder-plan.md` for documented scope + pending async sign-offs.)*
- [x] Schedule staging + production rollout checkpoints with Ops (who watches each deploy, rollback plan). *(Checkpoint dates + owners captured in `docs/rev4-stakeholder-plan.md`.)*
- [x] Push branch + open draft PR summarizing findings before coding begins; ensure Vercel preview build completes green. *(Draft PR https://github.com/nathan-eagle/granted/pull/17 with Vercel preview run `BmchQ6vKpMuPqKfoAJUyK25y336m` reported ✅.)*
- [x] After any fixes, `git push` the research commit and confirm the associated Vercel preview deploy is green before continuing. *(Branch `ux2-rev4/research` pushed; `gh pr checks 17` shows Vercel deploy completed.)*

---

## 1) Environment & dependencies
- [ ] Install/upgrade the official AgentKit SDK (`npm i @openai/agentkit` or the Node package documented in the quickstart). Record exact version in `docs/agentkit-notes.md`.
- [ ] Install ChatKit React bindings (`npm i @openai/chatkit-react` or canonical package). Note required peer dependencies (e.g., `@openai/chatkit-core`).
- [ ] Update `package.json` scripts: add `agentkit:pull`, `agentkit:push`, `chatkit:devtool` (names per docs) so teammates can sync schemas and run the design surface.
- [ ] Regenerate TypeScript types (`npx agentkit types` if applicable) and wire to `tsconfig.json` `paths`.
- [ ] Commit lockfile upgrades separately; run `npm run lint` and `npm run verify:ux2` locally to ensure no regressions.
- [ ] `git push` dependency updates and wait for Vercel preview to turn green; fix any lint/build/test issues before proceeding.

---

## 2) AgentKit project & secrets
- [ ] Create/confirm the AgentKit project in the OpenAI dashboard with production retention settings (≤30 days), action permissions, and connectors needed (File Search, Web, structured output).
- [ ] Generate API keys and scoped service tokens; store them in 1Password vault and rotate existing `.env` secrets.
- [ ] Update `.env.local.example`, Vercel project env vars, and `docs/agentkit-setup.md` with the new key names (`AGENTKIT_PROJECT_ID`, `AGENTKIT_API_KEY`, etc.).
- [ ] Add health-check script (`scripts/check-agentkit.ts`) that pings `agentkit.projects.get` and fails CI if credentials missing.
- [ ] Run the script locally and in CI (via GitHub Actions dry run) to verify credentials resolve.
- [ ] Commit secret plumbing (excluding actual keys); `git push` and ensure Vercel preview build + runtime env health checks pass.

---

## 3) Action registration & orchestration
- [ ] Rewrite `lib/agent/agentkit.ts` to export AgentKit **action descriptors** that wrap hosted functions (`agentkit.actions.register`). Remove legacy Prisma-only stubs.
- [ ] Implement `agentkit.config.ts` (per docs) defining the orchestrator agent, default tools, and memory stores.
- [ ] Replace `lib/agent/orchestrator.ts` logic with AgentKit `runs.create` + event subscriptions; ensure retries/backoff use Kit defaults.
- [ ] Migrate existing unit tests to call the AgentKit client (mock the network if needed) and assert schema conformance.
- [ ] Update scripts (`scripts/run-ux2-checks.js`) to invoke AgentKit runs rather than local helper functions.
- [ ] Push orchestrator changes to GitHub and verify Vercel preview (including serverless logs) stays green; remediate before moving on.

---

## 4) State, storage & migrations
- [ ] Audit Prisma models vs AgentKit state stores. Remove redundant JSON columns now covered by AgentKit memory (e.g., `rfpNormJson` if persisted in AgentKit) or document why they remain.
- [ ] Add new tables/indices for bridging data (e.g., `agentkit_run_events`, `chatkit_sessions`). Generate migrations and run locally.
- [ ] Implement backfill for existing projects (script to sync AgentKit state from Prisma legacy data once).
- [ ] Write migration playbook in `docs/ux2-migration.md` describing rollback steps and data validation queries.
- [ ] Run Playwright smoke tests + `npm run verify:ux2` to ensure schema changes do not break flows.
- [ ] Push migration commits, check GitHub checks + Vercel preview (database migrations included) are green before continuing.

---

## 5) Multi-document ingestion & conflict handling (AgentKit connectors)
- [ ] Configure AgentKit File Search / Intake connectors for PDF, OCR, HTML. Verify quotas and region alignment with compliance.
- [ ] Rewrite `/app/api/intake` to call `agentkit.actions.invoke('ingest_rfp_bundle', …)` and subscribe to ingestion events.
- [ ] Implement conflict surfacing via AgentKit event stream (`conflict.found`) and persist minimal metadata required for UI renders.
- [ ] Validate merge order logic using AgentKit-provided provenance (version/date) and update tests to cover FAQ/addendum flows.
- [ ] Document connector governance (logging, retention) in `docs/security-governance.md`.
- [ ] Push ingestion updates; confirm Vercel preview successfully parses sample bundles end-to-end. Fix issues until deploy stays green.

---

## 6) ChatKit workspace integration
- [ ] Replace `components/ux2/ConversationPanel` and `components/assistant/AssistantChat` with ChatKit workspace primitives (`<ChatKitProvider>`, `<Workspace>`, `<Thread>`, action drawers, run timeline).
- [ ] Wire ChatKit message feeds to AgentKit run events (stream tool calls, display status, allow retry/cancel per docs).
- [ ] Implement ChatKit upload widgets for RFP bundle intake, ensuring drag & drop and URL ingestion call the AgentKit connector.
- [ ] Map coverage/compliance/conflict panels into ChatKit’s right-rail slots using documented layout APIs.
- [ ] Run accessibility audit (keyboard nav, ARIA labels) using ChatKit’s guidelines + Lighthouse.
- [ ] Push UI changes and verify Vercel preview renders the ChatKit workspace without console errors; mend issues until green.

---

## 7) Eligibility gating & compliance simulator
- [ ] Port eligibility banner logic to consume AgentKit state events rather than Prisma polling; ensure overrides sync back to AgentKit memory.
- [ ] Update compliance simulator to fetch formatting constraints from AgentKit section metadata, and push tighten actions via hosted tool calls.
- [ ] Add regression tests covering fatal eligibility detection, user override, and tighten compliance success from ChatKit interactions.
- [ ] Confirm DOCX export still respects tighten metadata (AgentKit export tool or custom fallback).
- [ ] Update UX copy/docs to explain new gating within ChatKit workspace.
- [ ] Push eligibility/compliance changes; validate Vercel preview with staged RFP shows correct banners. Fix until deploy green.

---

## 8) Fix-next, Autopilot, and retries
- [ ] Refactor `FixNextPanel` to read AgentKit `suggestions` streams and surface action chips in-chat via ChatKit quick replies.
- [ ] Implement agent-triggered Autopilot runs using AgentKit’s run queue (schedule, observe status, show failure reasons in ChatKit transcript).
- [ ] Ensure retries/backpressure obey AgentKit throttling guidelines; log metrics to Observability panel.
- [ ] Update evaluation harness (`scripts/run-ux2-checks.js`) to assert Fix-next monotonic coverage using live AgentKit runs.
- [ ] Document Autopilot escape hatches (cancel, resume) in onboarding docs.
- [ ] Push Fix-next/autopilot changes; monitor Vercel preview logs for runtime stability. Resolve issues until deploy green.

---

## 9) Export & downstream integrations
- [ ] Decide whether to use the AgentKit DOCX export action or maintain custom docx builder. If using AgentKit, remove custom code and map download links through ChatKit file responses.
- [ ] Validate export artifacts include compliance + eligibility metadata; add smoke test that opens exported file (CI headless validation).
- [ ] Update `/app/api/export` routes to proxy AgentKit file URLs securely; ensure signed URLs expire per policy.
- [ ] Refresh end-user documentation + tooltips to reflect new export flow.
- [ ] Coordinate with Customer Success on release notes (DOCX changes, AgentKit-managed downloads).
- [ ] Push export updates; check Vercel preview for successful export run. Fix regressions until green.

---

## 10) Observability, evals, and SLO gating
- [ ] Integrate AgentKit telemetry into our Observability panel (coverage deltas, tool latencies, failure taxonomy). Store in analytics warehouse if required.
- [ ] Update CI to call AgentKit eval endpoints (or custom harness) and enforce SLO thresholds before merge.
- [ ] Add dashboards/alerts (Datadog, Grafana) for AgentKit metrics, ChatKit errors, and Vercel runtime health.
- [ ] Run load test (parallel runs) to validate quotas and throttling; document mitigations.
- [ ] Share SLO report with stakeholders and capture sign-off.
- [ ] Push observability changes; verify green Vercel deploy and monitoring dashboards populate as expected. Fix before advancing.

---

## 11) Security, compliance & launch
- [ ] Conduct security review: verify AgentKit data residency, connector permissions, ChatKit file handling, and updated threat model.
- [ ] Update DPA/Terms if AgentKit introduces new subprocessors or retention terms.
- [ ] Produce launch runbook: staging soak tests, production enablement checklist, rollback plan, support playbook.
- [ ] Host final go/no-go review; capture minutes in `docs/launch/ux2-rev4.md`.
- [ ] After approvals, push final changes to `main`, monitor production Vercel deploy, and confirm AgentKit dashboards show healthy traffic.
- [ ] Once production deploy is green, tag the release (`v2.0.0-rev4`), update CHANGELOG, and notify stakeholders.

---

**Reminder:** Do not skip the push/deploy gate at the end of each section. AgentKit runtime, ChatKit workspace, and Vercel hosting must stay in lockstep for Rev‑4. At the start of every section, re-open `docs/agentkit-notes.md`, the latest AgentKit/ChatKit release notes, and any linked runbooks so fresh context is in memory before executing tasks.
