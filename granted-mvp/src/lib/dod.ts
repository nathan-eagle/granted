export type AnswerKind = "text" | "date" | "url";

export interface DefinitionOfDoneItem {
  id: string;
  label: string;
  factIds: string[];
  question: string;
  answerKind: AnswerKind;
}

export interface SectionDefinition {
  id: string;
  label: string;
  description: string;
  items: DefinitionOfDoneItem[];
}

export const SECTION_DEFINITIONS: SectionDefinition[] = [
  {
    id: "rfp-overview",
    label: "Opportunity overview",
    description: "Lock in title, deadline, portal, and funder basics.",
    items: [
      {
        id: "solicitation_title",
        label: "Solicitation title",
        factIds: ["rfp.title"],
        question: "What is the official solicitation title?",
        answerKind: "text",
      },
      {
        id: "deadline",
        label: "Submission deadline",
        factIds: ["rfp.deadline"],
        question: "When is the proposal due (include time zone)?",
        answerKind: "date",
      },
      {
        id: "portal",
        label: "Submission portal",
        factIds: ["rfp.portal"],
        question: "Where do you submit (portal name or URL)?",
        answerKind: "url",
      },
    ],
  },
  {
    id: "eligibility",
    label: "Eligibility & compliance",
    description: "Confirm applicant type, registrations, and compliance checkpoints.",
    items: [
      {
        id: "eligibility_summary",
        label: "Eligibility requirements",
        factIds: ["eligibility.summary"],
        question: "Who is eligible and which registrations (SAM/UEI/etc.) are required?",
        answerKind: "text",
      },
    ],
  },
  {
    id: "project-narrative",
    label: "Project narrative",
    description: "Summarize the problem, solution, beneficiaries, and impact.",
    items: [
      {
        id: "project_focus",
        label: "Project focus",
        factIds: ["project.focus"],
        question: "Summarize the project’s problem, beneficiaries, and approach.",
        answerKind: "text",
      },
    ],
  },
  {
    id: "org-capacity",
    label: "Organizational capacity",
    description: "Highlight past performance, facilities, partnerships.",
    items: [
      {
        id: "org_capacity",
        label: "Organizational qualifications",
        factIds: ["org.capacity"],
        question: "What experience or capabilities prove your organization can deliver?",
        answerKind: "text",
      },
    ],
  },
  {
    id: "key-personnel",
    label: "Key personnel",
    description: "Capture key roles, resumes, and effort commitments.",
    items: [
      {
        id: "personnel_requirements",
        label: "Personnel requirements",
        factIds: ["personnel.requirements"],
        question: "Who are the key people (roles + short bios) on this proposal?",
        answerKind: "text",
      },
    ],
  },
  {
    id: "budget",
    label: "Budget & cost share",
    description: "Budget ceiling, match, indirect rates.",
    items: [
      {
        id: "budget_cap",
        label: "Budget ceiling",
        factIds: ["budget.cap"],
        question: "What is the maximum award or budget cap?",
        answerKind: "text",
      },
      {
        id: "cost_share",
        label: "Cost share / match",
        factIds: ["budget.match"],
        question: "Are cost share or match requirements specified?",
        answerKind: "text",
      },
    ],
  },
  {
    id: "timeline",
    label: "Timeline & milestones",
    description: "Phases, milestones, and key dates.",
    items: [
      {
        id: "timeline_requirements",
        label: "Timeline expectations",
        factIds: ["timeline.requirements"],
        question: "What major milestones or schedule expectations does the RFP call out?",
        answerKind: "text",
      },
    ],
  },
  {
    id: "evaluation",
    label: "Evaluation plan",
    description: "Metrics, success criteria, and data sources.",
    items: [
      {
        id: "evaluation_criteria",
        label: "Evaluation criteria",
        factIds: ["evaluation.criteria"],
        question: "How will reviewers evaluate proposals (criteria or scoring rubric)?",
        answerKind: "text",
      },
    ],
  },
  {
    id: "appendices",
    label: "Attachments & appendices",
    description: "Required forms, letters, supplements.",
    items: [
      {
        id: "attachments_requirements",
        label: "Required attachments",
        factIds: ["appendices.requirements"],
        question: "List required attachments or forms that must be included.",
        answerKind: "text",
      },
    ],
  },
];

export function getSectionDefinition(sectionId: string): SectionDefinition | undefined {
  return SECTION_DEFINITIONS.find((section) => section.id === sectionId);
}

