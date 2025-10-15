import { CoverageSnapshot, CoverageSlot } from "./types";

export type CoverageStatus = CoverageSlot["status"];

export interface CoverageSlotTemplate {
  id: string;
  label: string;
  notes: string;
  priority: number;
  sourceHints: string[];
  messageHints: string[];
  factSlotIds?: string[];
  factPartialThreshold?: number;
  factCompleteThreshold?: number;
}

export const COVERAGE_TEMPLATES: CoverageSlotTemplate[] = [
  {
    id: "rfp-overview",
    label: "Opportunity overview",
    notes: "Capture the solicitation title, deadline, and submission portal.",
    priority: 1,
    sourceHints: ["rfp", "solicitation", "opportunity", "notice", "funding"],
    messageHints: ["deadline", "submission", "opportunity overview", "program description"],
    factSlotIds: ["rfp.title", "rfp.deadline", "rfp.portal"],
    factPartialThreshold: 1,
    factCompleteThreshold: 2,
  },
  {
    id: "eligibility",
    label: "Eligibility & compliance",
    notes: "Confirm applicant eligibility, registrations, and required certifications.",
    priority: 2,
    sourceHints: ["eligibility", "compliance", "sam.gov", "registration", "duns"],
    messageHints: ["eligible", "eligible applicants", "sam", "registrations", "compliance"],
    factSlotIds: ["eligibility.summary"],
    factPartialThreshold: 1,
    factCompleteThreshold: 1,
  },
  {
    id: "project-narrative",
    label: "Project narrative",
    notes: "Outline problem, beneficiaries, and impact story.",
    priority: 3,
    sourceHints: ["narrative", "project description", "statement of need", "impact"],
    messageHints: ["project narrative", "summary", "need", "impact", "beneficiaries"],
    factSlotIds: ["project.focus", "format.page_limit"],
    factPartialThreshold: 1,
    factCompleteThreshold: 1,
  },
  {
    id: "org-capacity",
    label: "Organizational capacity",
    notes: "Summarize org history, capability, and prior results.",
    priority: 4,
    sourceHints: ["organization", "capacity", "about us", "track record"],
    messageHints: ["org capacity", "experience", "track record"],
    factSlotIds: ["org.capacity"],
    factPartialThreshold: 1,
    factCompleteThreshold: 1,
  },
  {
    id: "key-personnel",
    label: "Key personnel",
    notes: "Collect bios, resumes, and role assignments.",
    priority: 5,
    sourceHints: ["resume", "cv", "bio", "team", "personnel"],
    messageHints: ["key personnel", "team", "staff", "resume", "bio"],
    factSlotIds: ["personnel.requirements"],
    factPartialThreshold: 1,
    factCompleteThreshold: 1,
  },
  {
    id: "budget",
    label: "Budget & cost share",
    notes: "Detail line items, match requirements, and indirect cost rates.",
    priority: 6,
    sourceHints: ["budget", "financial", "cost share", "match", "narrative budget"],
    messageHints: ["budget", "cost share", "matching", "financial plan"],
    factSlotIds: ["budget.cap", "budget.match"],
    factPartialThreshold: 1,
    factCompleteThreshold: 1,
  },
  {
    id: "timeline",
    label: "Timeline & milestones",
    notes: "Lay out schedule, milestones, and workplan.",
    priority: 7,
    sourceHints: ["timeline", "schedule", "milestone", "gantt", "work plan"],
    messageHints: ["timeline", "milestone", "schedule", "workplan"],
    factSlotIds: ["timeline.requirements"],
    factPartialThreshold: 1,
    factCompleteThreshold: 1,
  },
  {
    id: "evaluation",
    label: "Evaluation plan",
    notes: "Define metrics, data collection, and success criteria.",
    priority: 8,
    sourceHints: ["evaluation", "metrics", "logic model", "measurement"],
    messageHints: ["evaluation", "metrics", "measure", "outcomes"],
    factSlotIds: ["evaluation.criteria"],
    factPartialThreshold: 1,
    factCompleteThreshold: 1,
  },
  {
    id: "appendices",
    label: "Attachments & appendices",
    notes: "Track required forms, letters, and supplemental docs.",
    priority: 9,
    sourceHints: ["appendix", "attachment", "form", "letter", "support"],
    messageHints: ["attachments", "appendix", "support letter"],
    factSlotIds: ["appendices.requirements"],
    factPartialThreshold: 1,
    factCompleteThreshold: 1,
  },
];

export function promoteStatus(current: CoverageStatus | undefined, next: CoverageStatus): CoverageStatus {
  const rank: Record<CoverageStatus, number> = {
    missing: 0,
    partial: 1,
    complete: 2,
  };
  if (!current) return next;
  return rank[next] > rank[current] ? next : current;
}

export interface CoverageComputationInput {
  sections: CoverageSlot[];
}

export function computeCoverageScore(slots: CoverageSlot[]): number {
  if (!slots.length) return 0;
  const points = slots.reduce((acc, slot) => {
    if (slot.status === "complete") return acc + 1;
    if (slot.status === "partial") return acc + 0.5;
    return acc;
  }, 0);
  return Math.min(1, points / slots.length);
}

export function createCoverageSnapshot(slots: CoverageSlot[], summary?: string): CoverageSnapshot {
  return {
    score: computeCoverageScore(slots),
    summary: summary ?? "Tracking active RFP sections.",
    slots,
    updatedAt: Date.now(),
  };
}
