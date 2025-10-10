import { Prisma } from "@prisma/client"

import { prisma } from "../prisma"
import { callAgentActionWithAgents } from "./runner"
import type { AgentActionInput } from "./agentkit"
import { persistAgentState } from "./state"
import { recordMetric } from "../observability/metrics"
import type { CoverageV1 } from "../contracts"

function toSectionKey(requirementId: string): string {
  return requirementId.split(".")[0] ?? requirementId
}

async function ensureSectionExists(projectId: string, sectionKey: string) {
  const section = await prisma.section.findFirst({ where: { projectId, key: sectionKey } })
  if (!section) {
    throw new Error(`Section ${sectionKey} not found for project ${projectId}`)
  }
  return section
}

export async function applySuggestion(
  projectId: string,
  suggestion: { id: string; requirementId: string; action: string }
) {
  const sectionKey = toSectionKey(suggestion.requirementId)

  const blockingRun = await prisma.agentWorkflowRun.findFirst({
    where: {
      projectId,
      status: { in: ["running", "pending"] },
    },
  })
  if (blockingRun) {
    throw new Error("An AgentKit run is already in progress. Please wait before applying another suggestion.")
  }

  if (suggestion.action === "draft") {
    await ensureSectionExists(projectId, sectionKey)
    const start = Date.now()
    await callAgentActionWithAgents("draft_section", {
      projectId,
      section_key: sectionKey,
    } as AgentActionInput<"draft_section">)
    await callAgentActionWithAgents("tighten_section", {
      projectId,
      section_key: sectionKey,
      simulator: {},
    } as AgentActionInput<"tighten_section">)
    await recordMetric({
      event: "suggestion.applied",
      projectId,
      action: suggestion.action,
      status: "completed",
      durationMs: Date.now() - start,
      metadata: { suggestionId: suggestion.id, requirementId: suggestion.requirementId },
    })
  } else {
    await recordMetric({
      event: "suggestion.skipped",
      projectId,
      action: suggestion.action,
      status: "manual",
      metadata: { suggestionId: suggestion.id },
    })
  }

  const coverage = (await callAgentActionWithAgents("score_coverage", {
    projectId,
  } as AgentActionInput<"score_coverage">)) as CoverageV1

  await persistAgentState({ projectId, coverage })

  return {
    suggestionId: suggestion.id,
    coverage,
  }
}
