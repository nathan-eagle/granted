export type BlueprintSection = {
  key: string
  title: string
  targetWords?: number
  promptTemplate: string
}

export type Blueprint = {
  slug: string
  label: string
  sections: BlueprintSection[]
  variables: { key: string; label: string; hint?: string }[]
}

export const NSF_SBIR_PHASE_I: Blueprint = {
  slug: "nsf-sbir-phase-i",
  label: "NSF SBIR Phase I",
  variables: [
    { key: "org_mission", label: "Organization mission", hint: "1-2 sentences" },
    { key: "product_name", label: "Product/innovation name" },
    { key: "target_customer", label: "Primary customer/beneficiary" },
    { key: "problem", label: "Problem statement (why now?)" },
    { key: "innovation_summary", label: "What is novel?" },
    { key: "evidence", label: "Evidence/prior results (pilots, publications)" },
  ],
  sections: [
    {
      key: "project-pitch",
      title: "Project Pitch",
      targetWords: 250,
      promptTemplate: "Write an NSF SBIR Project Pitch for {{product_name}}. Explain the problem ({{problem}}), the innovation ({{innovation_summary}}), target users ({{target_customer}}), and why NSF funding is appropriate. Use sources for concrete evidence ({{evidence}}). Aim for {{targetWords}} words."
    },
    {
      key: "technical-objectives",
      title: "Technical Objectives & Work Plan",
      targetWords: 600,
      promptTemplate: "Draft clear, measurable technical objectives for Phase I and a brief 6-9 month work plan. Use bullets for tasks and expected outcomes. Ground claims in sources. Aim for {{targetWords}} words."
    },
    {
      key: "intellectual-merit",
      title: "Intellectual Merit",
      targetWords: 300,
      promptTemplate: "Explain the intellectual merit: novelty, rigor, and contribution to the field. Reference prior art from sources and clarify how this differs. Aim for {{targetWords}} words."
    },
    {
      key: "broader-impacts",
      title: "Broader Impacts",
      targetWords: 300,
      promptTemplate: "Describe broader impacts and societal benefits for {{target_customer}}. Include diversity, accessibility, and workforce development considerations. Aim for {{targetWords}} words."
    },
    {
      key: "commercialization",
      title: "Commercialization Plan",
      targetWords: 600,
      promptTemplate: "Outline a commercialization plan: market size, ICP, go-to-market, pricing, competition, IP, and milestones to Phase II. Use sources for realistic numbers. Aim for {{targetWords}} words."
    },
    {
      key: "team-facilities",
      title: "Team & Facilities",
      targetWords: 250,
      promptTemplate: "Summarize key personnel, roles, and relevant past successes. Describe available facilities/instrumentation and partner organizations. Aim for {{targetWords}} words."
    },
    {
      key: "risk-mitigation",
      title: "Risks & Mitigations",
      targetWords: 250,
      promptTemplate: "List top technical, regulatory, and execution risks. Propose mitigations and objective success criteria. Aim for {{targetWords}} words."
    },
    {
      key: "budget-justification",
      title: "Budget Justification",
      targetWords: 300,
      promptTemplate: "Draft a concise budget justification covering personnel, equipment, materials, travel, and indirects. Ensure consistency with the work plan. Aim for {{targetWords}} words."
    }
  ]
}

export default NSF_SBIR_PHASE_I
