import type { AgentActionInput } from "./agentkit"
import { agentkit } from "@/lib/agentkit/client"
import { callAgentActionWithAgents } from "./runner"
import { loadAgentState, persistAgentState } from "./state"
import { prisma } from "../prisma"

export type IntakeOptions = {
  projectId: string
  urls?: string[]
  files?: { uploadId?: string; path?: string; name?: string }[]
  uploadIds?: string[]
}

export async function runIntake(options: IntakeOptions) {
  const { projectId, urls = [], files = [], uploadIds } = options
  const ingestionUploadIds = uploadIds
    ? uploadIds
    : (
        await agentkit.actions.invoke("ingest_rfp_bundle", {
          projectId,
          urls,
          files,
        } satisfies AgentActionInput<"ingest_rfp_bundle">)
      ).uploadIds

  if (ingestionUploadIds.length) {
    const sharedArgs = { projectId, uploadIds: ingestionUploadIds }
    const rfpNorm = await callAgentActionWithAgents(
      "normalize_rfp",
      sharedArgs as AgentActionInput<"normalize_rfp">
    )
    await persistAgentState({
      projectId,
      rfpNorm,
      eligibility: { items: rfpNorm.eligibility ?? [] },
    })
    const facts = await callAgentActionWithAgents("mine_facts", sharedArgs as AgentActionInput<"mine_facts">)
    await persistAgentState({ projectId, facts })
  }
  const coverage = await callAgentActionWithAgents("score_coverage", { projectId } as AgentActionInput<"score_coverage">)
  await persistAgentState({ projectId, coverage })
  return coverage
}

export async function runDraftAndTighten(projectId: string) {
  const state = await loadAgentState(projectId)
  if (!state?.rfpNorm) {
    await runIntake({ projectId })
  }

  const sections = await prisma.section.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
  })

  for (const section of sections) {
    if (!section.contentMd?.trim()) {
      const sectionArgs = { projectId, section_key: section.key }
      await callAgentActionWithAgents("draft_section", sectionArgs as AgentActionInput<"draft_section">)
      await callAgentActionWithAgents("tighten_section", sectionArgs as AgentActionInput<"tighten_section">)
    }
  }

  const coverage = await callAgentActionWithAgents("score_coverage", { projectId } as AgentActionInput<"score_coverage">)
  await persistAgentState({ projectId, coverage })
  return coverage
}
