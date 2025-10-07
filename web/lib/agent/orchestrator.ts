import { ingestRfpBundle, normalizeRfp, mineFacts, scoreCoverage, draftSection, tightenSection } from "./actions"
import { loadAgentState, persistAgentState } from "./state"
import { prisma } from "../prisma"

export type IntakeOptions = {
  projectId: string
  urls?: string[]
  files?: { uploadId?: string; path?: string; name?: string }[]
}

export async function runIntake(options: IntakeOptions) {
  const { projectId, urls = [], files = [] } = options
  const ingestionResult = await ingestRfpBundle({ projectId, urls, files })
  if (ingestionResult.uploadIds.length) {
    await normalizeRfp({ projectId, uploadIds: ingestionResult.uploadIds })
    await mineFacts({ projectId, uploadIds: ingestionResult.uploadIds })
  }
  const coverage = await scoreCoverage({ projectId })
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
      await draftSection({ projectId, section_key: section.key })
      await tightenSection({ projectId, section_key: section.key })
    }
  }

  const coverage = await scoreCoverage({ projectId })
  await persistAgentState({ projectId, coverage })
  return coverage
}
