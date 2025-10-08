# Rev 4 Stakeholder Alignment

_Last updated: 2025-10-07T14:50Z_

## Product & Support Alignment
- **Scope reaffirmed:** Multi-doc bundles, conflict resolution UI, eligibility gating, Fix-next Value/Effort matrix, compliance simulator, eval SLO guardrails.
- **Assumptions captured:** No net-new features beyond Rev-3 additions; focus is migrating orchestration/UI to hosted AgentKit + ChatKit.
- **Action items:**
  - Product (Nate) to confirm updated north-star storyboard still accurate post-migration.
  - Support (Jess) to prep help-center draft highlighting ChatKit workspace changes and eligibility banners.
- **Status:** Document shared in #granted-product Slack thread (placeholder) with request for async sign-off by 2025-10-08 EOD.

## Ops Rollout Checkpoints
- **Staging soak:**
  - Target date: 2025-10-14.
  - Owners: Ops (Leo), Eng (You), Support (Jess) to monitor RFP ingestion, ChatKit session health, AgentKit tool invocation logs.
  - Rollback: revert to Rev-3 workflow + disable feature flag `UX2_REV4` in LaunchDarkly.
- **Production launch window:**
  - Target date: 2025-10-21 (2-hour window 10:00–12:00 PT).
  - Preconditions: staging soak metrics green for 48 hours, CI SLO gate passing, Vercel production dry-run deploy green.
  - Rollback: redeploy previous workflow version `wf_rev3_2024-09-18`, re-enable legacy UI components.
- **Monitoring:**
  - Datadog dashboards `AgentKit/ChatKit` to display coverage delta, run throughput, error rates.
  - PagerDuty escalation: Ops primary (Leo), Eng secondary (You), Support tertiary (Jess).

## Next Steps
- Collect sign-offs and paste approvals into this doc.
- Convert dates into calendar holds once stakeholders confirm availability.
