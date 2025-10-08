import { Prisma } from "@prisma/client"

import { prisma } from "../prisma"
import {
  CoverageV1,
  CoverageV1Schema,
  FactsV1,
  FactsV1Schema,
  RfpNormV1,
  RfpNormV1Schema,
} from "../contracts"

export type StoredState = {
  projectId: string
  rfpNorm?: RfpNormV1
  facts?: FactsV1
  coverage?: CoverageV1
  conflictLog?: Record<string, unknown>[]
  eligibility?: Record<string, unknown>
  formatLimits?: Record<string, unknown>
}

export async function loadAgentState(projectId: string): Promise<StoredState | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      rfpNormJson: true,
      factsJson: true,
      coverageJson: true,
      conflictLogJson: true,
      eligibilityJson: true,
      sections: {
        select: { key: true, formatLimits: true },
      },
    },
  })

  if (!project) return null

  return {
    projectId: project.id,
    rfpNorm: project.rfpNormJson ? RfpNormV1Schema.parse(project.rfpNormJson) : undefined,
    facts: project.factsJson ? FactsV1Schema.parse(project.factsJson) : undefined,
    coverage: project.coverageJson ? CoverageV1Schema.parse(project.coverageJson) : undefined,
    conflictLog: Array.isArray(project.conflictLogJson)
      ? (project.conflictLogJson.filter(item => item && typeof item === "object") as Record<string, unknown>[])
      : undefined,
    eligibility:
      project.eligibilityJson && typeof project.eligibilityJson === "object"
        ? (project.eligibilityJson as Record<string, unknown>)
        : undefined,
    formatLimits: project.sections.reduce<Record<string, unknown>>((acc, section) => {
      if (section.formatLimits) acc[section.key] = section.formatLimits
      return acc
    }, {}),
  }
}

export async function persistAgentState(state: StoredState) {
  const projectUpdate: Prisma.ProjectUpdateArgs["data"] = {}

  if (state.rfpNorm !== undefined) {
    projectUpdate.rfpNormJson = state.rfpNorm as Prisma.InputJsonValue
  }
  if (state.facts !== undefined) {
    projectUpdate.factsJson = state.facts as Prisma.InputJsonValue
  }
  if (state.coverage !== undefined) {
    projectUpdate.coverageJson = state.coverage as Prisma.InputJsonValue
  }
  if (state.conflictLog !== undefined) {
    projectUpdate.conflictLogJson = state.conflictLog as Prisma.InputJsonValue
  }
  if (state.eligibility !== undefined) {
    projectUpdate.eligibilityJson = state.eligibility as Prisma.InputJsonValue
  }

  if (Object.keys(projectUpdate).length) {
    await prisma.project.update({ where: { id: state.projectId }, data: projectUpdate })
  }

  if (state.formatLimits) {
    const sections = await prisma.section.findMany({
      where: { projectId: state.projectId },
      select: { id: true, key: true },
    })

    const updates = sections
      .map(section => ({
        id: section.id,
        data: state.formatLimits && state.formatLimits[section.key],
      }))
      .filter(entry => entry.data)

    await Promise.all(
      updates.map(entry =>
        prisma.section.update({
          where: { id: entry.id },
          data: { formatLimits: entry.data as Prisma.InputJsonValue },
        })
      )
    )
  }
}
