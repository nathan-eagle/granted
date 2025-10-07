import { executeAgentAction, type AgentActionInput } from "./agentkit"
import { loadAgentState, persistAgentState } from "./state"
import { prisma } from "../prisma"

export type IntakeOptions = {
  projectId: string
  urls?: string[]
  files?: { uploadId?: string; path?: string; name?: string }[]
}

export async function runIntake(options: IntakeOptions) {
  const { projectId, urls = [], files = [] } = options
  const ingestionResult = await executeAgentAction(
    "ingest_rfp_bundle",
    { projectId, urls, files } satisfies AgentActionInput<"ingest_rfp_bundle">
  )
  if (ingestionResult.uploadIds.length) {
    const sharedArgs = { projectId, uploadIds: ingestionResult.uploadIds }
    await executeAgentAction("normalize_rfp", sharedArgs as AgentActionInput<"normalize_rfp">)
    await executeAgentAction("mine_facts", sharedArgs as AgentActionInput<"mine_facts">)
  }
  const coverage = await executeAgentAction(
    "score_coverage",
    { projectId } as AgentActionInput<"score_coverage">
  )
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
      await executeAgentAction("draft_section", sectionArgs as AgentActionInput<"draft_section">)
      await executeAgentAction("tighten_section", sectionArgs as AgentActionInput<"tighten_section">)
    }
  }

  const coverage = await executeAgentAction(
    "score_coverage",
    { projectId } as AgentActionInput<"score_coverage">
  )
  await persistAgentState({ projectId, coverage })
  return coverage
}
