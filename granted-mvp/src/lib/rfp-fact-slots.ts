export type FactParser = "datetime" | "money" | "text";

export interface FactSlotDefinition {
  slotId: string;
  coverageId: string;
  summary: string;
  parser: FactParser;
  instruction: string;
}

export const RFP_FACT_SLOTS: FactSlotDefinition[] = [
  {
    slotId: "rfp.title",
    coverageId: "rfp-overview",
    summary: "Solicitation title",
    parser: "text",
    instruction: "Provide the official solicitation or opportunity title exactly as written in the RFP.",
  },
  {
    slotId: "rfp.deadline",
    coverageId: "rfp-overview",
    summary: "Application deadline",
    parser: "datetime",
    instruction: "Provide the full application deadline including any time zone or time of day, if stated.",
  },
  {
    slotId: "rfp.portal",
    coverageId: "rfp-overview",
    summary: "Submission portal",
    parser: "text",
    instruction: "Provide the submission portal URL or instructions describing where/how to submit.",
  },
  {
    slotId: "eligibility.summary",
    coverageId: "eligibility",
    summary: "Eligibility requirements",
    parser: "text",
    instruction: "Summarize applicant eligibility requirements (who can apply, mandatory registrations, key thresholds).",
  },
  {
    slotId: "project.focus",
    coverageId: "project-narrative",
    summary: "Project focus",
    parser: "text",
    instruction: "Summarize the stated project focus, goals, or priority areas the funder expects.",
  },
  {
    slotId: "org.capacity",
    coverageId: "org-capacity",
    summary: "Organizational capacity expectations",
    parser: "text",
    instruction: "Capture organizational qualifications or capabilities the RFP calls for.",
  },
  {
    slotId: "personnel.requirements",
    coverageId: "key-personnel",
    summary: "Personnel requirements",
    parser: "text",
    instruction: "List personnel qualifications, required roles, or staffing expectations mentioned.",
  },
  {
    slotId: "budget.cap",
    coverageId: "budget",
    summary: "Budget ceiling",
    parser: "money",
    instruction: "State the maximum award amount, budget cap, or ceiling if specified.",
  },
  {
    slotId: "budget.match",
    coverageId: "budget",
    summary: "Cost share requirements",
    parser: "text",
    instruction: "Describe any cost share, match, or in-kind contribution requirements.",
  },
  {
    slotId: "timeline.requirements",
    coverageId: "timeline",
    summary: "Timeline expectations",
    parser: "text",
    instruction: "Summarize schedule expectations, period of performance, or milestones required.",
  },
  {
    slotId: "evaluation.criteria",
    coverageId: "evaluation",
    summary: "Evaluation criteria",
    parser: "text",
    instruction: "List the evaluation criteria or scoring rubric used to assess proposals.",
  },
  {
    slotId: "appendices.requirements",
    coverageId: "appendices",
    summary: "Required attachments",
    parser: "text",
    instruction: "List required attachments, forms, or appendices that must be submitted.",
  },
  {
    slotId: "format.page_limit",
    coverageId: "project-narrative",
    summary: "Formatting constraints",
    parser: "text",
    instruction: "Capture any page limits or formatting constraints (font, spacing) for the narrative.",
  },
];
