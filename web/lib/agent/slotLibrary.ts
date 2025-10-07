export type SlotDefinition = {
  key: string
  label: string
}

const DEFAULT_SLOTS: SlotDefinition[] = [
  { key: "problem", label: "Problem" },
  { key: "beneficiaries", label: "Beneficiaries" },
  { key: "innovation", label: "Innovation" },
  { key: "prior_results", label: "Prior Results" },
  { key: "approach", label: "Approach" },
  { key: "milestones", label: "Milestones" },
  { key: "risks", label: "Risks" },
  { key: "mitigation", label: "Mitigation" },
  { key: "evaluation", label: "Evaluation" },
  { key: "impact", label: "Impact" },
  { key: "commercialization", label: "Commercialization" },
  { key: "team", label: "Team" },
  { key: "facilities", label: "Facilities" },
  { key: "budget_justification", label: "Budget Justification" },
  { key: "dissemination", label: "Dissemination" },
]

const SECTION_SLOT_HINTS: Record<string, string[]> = {
  narrative: ["problem", "approach", "impact", "evaluation"],
  needs: ["problem", "beneficiaries"],
  innovation: ["innovation", "prior_results"],
  commercialization: ["commercialization", "market"],
  timeline: ["milestones"],
  risks: ["risks", "mitigation"],
  budget: ["budget_justification"],
  team: ["team", "facilities"],
}

export function slotsForSection(sectionKey: string): SlotDefinition[] {
  const hints = SECTION_SLOT_HINTS[sectionKey] ||
    DEFAULT_SLOTS.filter(slot => sectionKey.includes(slot.key))

  const preferredKeys = new Set(hints?.length ? hints : DEFAULT_SLOTS.map(s => s.key))

  return DEFAULT_SLOTS.filter(slot => preferredKeys.has(slot.key)).slice(0, 6)
}
