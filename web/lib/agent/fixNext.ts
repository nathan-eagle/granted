import { CoverageV1 } from "../contracts"

export type FixSuggestion = {
  id: string
  requirementId: string
  action: "upload" | "answer" | "draft"
  label: string
  value_score: number
  effort_score: number
  ratio: number
}

const ACTION_KEYWORDS: Record<string, { action: FixSuggestion["action"]; label: string }> = {
  bio: { action: "upload", label: "Upload team bios" },
  budget: { action: "answer", label: "Add budget summary" },
  commercialization: { action: "draft", label: "Describe commercialization plan" },
  narrative: { action: "draft", label: "Draft project narrative" },
}

function inferAction(requirementId: string): { action: FixSuggestion["action"]; label: string } {
  const lower = requirementId.toLowerCase()
  for (const key of Object.keys(ACTION_KEYWORDS)) {
    if (lower.includes(key)) return ACTION_KEYWORDS[key]
  }
  return { action: "draft", label: "Draft missing content" }
}

export function computeFixSuggestions(coverage: CoverageV1): FixSuggestion[] {
  return coverage.requirements
    .filter(req => req.status === "missing" || req.status === "stubbed")
    .map(req => {
      const { action, label } = inferAction(req.id)
      const weight = req.weight ?? 1
      const evidenceRank = req.evidence_rank ?? 0
      const statusWeight = req.status === "missing" ? 1 : 0.5
      const value = weight * (1 + evidenceRank) * statusWeight
      const effort = req.status === "missing" ? 0.6 : 0.4
      const ratio = effort > 0 ? value / effort : value
      return {
        id: `fix-${req.id}`,
        requirementId: req.id,
        action,
        label,
        value_score: Number(value.toFixed(3)),
        effort_score: Number(effort.toFixed(3)),
        ratio: Number(ratio.toFixed(3)),
      }
    })
    .sort((a, b) => b.ratio - a.ratio)
}
