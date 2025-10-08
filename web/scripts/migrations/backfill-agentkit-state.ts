import { Prisma, PrismaClient } from "@prisma/client"

import { agentKitRuntimeConfig } from "../../lib/agent/agentkit.config"

const prisma = new PrismaClient()

function hasLegacyState(project: { rfpNormJson: Prisma.JsonValue | null; factsJson: Prisma.JsonValue | null; coverageJson: Prisma.JsonValue | null; conflictLogJson: Prisma.JsonValue | null; eligibilityJson: Prisma.JsonValue | null }) {
  return [project.rfpNormJson, project.factsJson, project.coverageJson, project.conflictLogJson, project.eligibilityJson].some(
    value => value !== null && value !== undefined
  )
}

async function main() {
  const workflowId = agentKitRuntimeConfig.workflowId
  const projects = await prisma.project.findMany({
    select: {
      id: true,
      rfpNormJson: true,
      factsJson: true,
      coverageJson: true,
      conflictLogJson: true,
      eligibilityJson: true,
    },
  })

  let processed = 0

  for (const project of projects) {
    if (!hasLegacyState(project)) continue

    const runId = `legacy_${project.id}`
    const snapshot = {
      source: "legacy_snapshot",
      rfpNorm: project.rfpNormJson ?? null,
      facts: project.factsJson ?? null,
      coverage: project.coverageJson ?? null,
      conflicts: project.conflictLogJson ?? null,
      eligibility: project.eligibilityJson ?? null,
    }

    await prisma.agentWorkflowRun.upsert({
      where: { id: runId },
      update: {
        workflowId,
        projectId: project.id,
        status: "succeeded",
        input: { snapshotSource: "legacy" } as Prisma.InputJsonValue,
        result: snapshot as Prisma.InputJsonValue,
        error: null,
        startedAt: new Date(0),
        completedAt: new Date(),
      },
      create: {
        id: runId,
        workflowId,
        projectId: project.id,
        status: "succeeded",
        input: { snapshotSource: "legacy" } as Prisma.InputJsonValue,
        result: snapshot as Prisma.InputJsonValue,
        startedAt: new Date(0),
        completedAt: new Date(),
      },
    })

    await prisma.agentWorkflowRunEvent.deleteMany({ where: { runId } })

    if (project.coverageJson) {
      await prisma.agentWorkflowRunEvent.create({
        data: {
          runId,
          type: "coverage.legacy",
          payload: project.coverageJson as Prisma.InputJsonValue,
        },
      })
    }

    if (Array.isArray(project.conflictLogJson)) {
      for (const entry of project.conflictLogJson) {
        await prisma.agentWorkflowRunEvent.create({
          data: {
            runId,
            type: "conflict.legacy",
            payload: (entry ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          },
        })
      }
    }

    if (project.eligibilityJson) {
      await prisma.agentWorkflowRunEvent.create({
        data: {
          runId,
          type: "eligibility.legacy",
          payload: project.eligibilityJson as Prisma.InputJsonValue,
        },
      })
    }

    processed += 1
  }

  console.log(`Backfilled legacy AgentKit state for ${processed} project(s).`)
}

main()
  .catch(error => {
    console.error("Backfill failed", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
