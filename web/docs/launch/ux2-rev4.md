# UX2 Rev4 Launch Runbook

## Staging Soak Checklist
- [ ] Deploy `main` to staging (Vercel preview) and confirm ChatKit workspace renders with seeded data.
- [ ] Trigger intake + suggestion flows using sample bundle; verify conflict log, eligibility overrides, and tighten telemetry land in `AgentWorkflowRunEvent`.
- [ ] Run `npm run verify:ux2` and `npm run observability:report` against staging backing data.
- [ ] Validate exports via `/api/export/docx?projectId=...` download link; confirm file opens in Word Preview.
- [ ] Smoke test Playwright suite (`npx playwright test --project=chromium`).

## Production Enablement Checklist
- [ ] Set `CHATKIT_WORKFLOW_ID` + `NEXT_PUBLIC_CHATKIT_WORKFLOW_ID` and connector IDs in Vercel prod project.
- [ ] Run `prisma migrate deploy` (schemas up through `20251008160000_chatkit_session_unique`).
- [ ] Seed `ChatKitSession` rows for top QA projects (optional) by loading `/overview` while logged in.
- [ ] Confirm observability dashboards (latency, suggestion adoption, export throughput) show live data.
- [ ] Send rollout notice to Support with eligibility override guidance.

## Rollback Plan
1. Restore Vercel project env to previous `main` deployment (UI toggle off) using `legacy-dashboard` branch if needed.
2. Re-run `prisma migrate deploy --schema prisma/schema.prisma` with a down migration removing knowledge base/conflict tables if telemetry requires.
3. Disable ChatKit connectors in AgentKit dashboard (set traffic to 0%).
4. Notify stakeholders via #launch-status Slack channel.

## Go/No-Go Review Minutes
- To be captured during final review (date, attendees, decision, follow-up items).

