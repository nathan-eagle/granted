import { prisma } from "@/lib/prisma"
import { simulateCompliance, type SimulatorOptions } from "@/lib/compliance/simulator"
import type { CoverageV1 } from "@/lib/contracts"

export const SUMMARY_SECTION_KEY = "summary"
export const SUMMARY_SECTION_TITLE = "Project Summary"

export type DraftSectionSnapshot = {
  key: string
  title: string
  markdown: string
  compliance?: {
    status: "ok" | "overflow"
    wordCount: number
    estimatedPages: number
  }
  settings?: SimulatorOptions
  assumptions?: string[]
}

export type DraftSnapshot = {
  projectId: string
  sections: DraftSectionSnapshot[]
  coverage?: number
  coverageSuggestions?: CoverageV1["suggestions"]
}

export type ProjectDraftRecord = {
  id: string
  meta: any
  coverageJson: any
  sections: Array<{
    key: string
    title: string
    contentMd: string | null
    formatLimits: any
    contentJson: any
  }>
}

export function buildDraftFromProject(
  project: ProjectDraftRecord,
  summaryOverride?: string | null,
  coverageOverride?: number | null,
): DraftSnapshot {
  const summarySection = project.sections.find(section => section.key === SUMMARY_SECTION_KEY)
  const detailSections = project.sections.filter(section => section.key !== SUMMARY_SECTION_KEY)

  const summaryMarkdown =
    typeof summaryOverride === "string"
      ? summaryOverride
      : summarySection?.contentMd ??
        (typeof (project.meta as any)?.lastSummary === "string" ? (project.meta as any).lastSummary : "")

  const buildSectionSnapshot = (section: ProjectDraftRecord["sections"][number], overrideMarkdown?: string): DraftSectionSnapshot => {
    const markdown = overrideMarkdown ?? section.contentMd ?? ""
    const limits = section.formatLimits as { settings?: SimulatorOptions; result?: any } | null
    const settings = limits?.settings ?? (typeof limits === "object" && !limits?.settings ? (limits as SimulatorOptions) : undefined)
    const complianceResult = limits?.result
      ? {
          status: complianceStatus(limits.result.status),
          wordCount: Number(limits.result.wordCount ?? limits.result.words ?? markdown.split(/\s+/).filter(Boolean).length),
          estimatedPages: Number(limits.result.estimatedPages ?? limits.result.pages ?? 0),
        }
      : (() => {
          const result = simulateCompliance(markdown, settings)
          return {
            status: result.status,
            wordCount: result.wordCount,
            estimatedPages: Number(result.estimatedPages.toFixed(2)),
          }
        })()

    const paragraphMeta = Array.isArray(section.contentJson) ? section.contentJson : []
    const assumptions = paragraphMeta
      .filter(entry => Boolean(entry?.assumption))
      .map(entry => String(entry?.requirement_path || entry?.label || "Assumption"))

    return {
      key: section.key,
      title: section.title,
      markdown,
      compliance: complianceResult,
      ...(settings ? { settings } : {}),
      ...(assumptions.length ? { assumptions } : {}),
    }
  }

  const sections: DraftSectionSnapshot[] = [
    buildSectionSnapshot(
      summarySection ?? {
        key: SUMMARY_SECTION_KEY,
        title: SUMMARY_SECTION_TITLE,
        contentMd: summaryMarkdown,
        formatLimits: null,
        contentJson: null,
      },
      summaryMarkdown,
    ),
    ...detailSections.map(section => buildSectionSnapshot(section)),
  ]

  const coverage =
    typeof coverageOverride === "number"
      ? coverageOverride
      : typeof (project.coverageJson as any)?.score === "number"
        ? (project.coverageJson as any).score
        : undefined
  const coverageSuggestions: CoverageV1["suggestions"] | undefined = Array.isArray((project.coverageJson as any)?.suggestions)
    ? (project.coverageJson as any).suggestions
    : undefined

  return {
    projectId: project.id,
    sections,
    ...(typeof coverage === "number" ? { coverage } : {}),
    ...(coverageSuggestions ? { coverageSuggestions } : {}),
  }
}

export async function loadDraftSnapshot(
  projectId: string,
  summaryOverride?: string | null,
  coverageOverride?: number | null,
): Promise<DraftSnapshot> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      meta: true,
      coverageJson: true,
      sections: {
        orderBy: { order: "asc" },
        select: { key: true, title: true, contentMd: true, formatLimits: true, contentJson: true },
      },
    },
  })
  if (!project) {
    throw new Error(`Project ${projectId} not found`)
  }
  return buildDraftFromProject(project, summaryOverride, coverageOverride)
}

function complianceStatus(value: unknown): "ok" | "overflow" {
  if (value === "overflow" || value === "warning") return "overflow"
  return "ok"
}
