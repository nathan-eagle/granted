#!/usr/bin/env ts-node

import { prisma } from "@/lib/prisma"

async function main() {
  const projectsWithoutSessions = await prisma.project.findMany({
    where: {
      agentSessions: { none: {} },
    },
    select: { id: true },
  })

  for (const project of projectsWithoutSessions) {
    await prisma.agentSession.create({
      data: {
        projectId: project.id,
        transcriptJson: [],
      },
    })
  }

  const sessionsWithoutMemory = await prisma.agentSession.findMany({
    where: { memoryId: null },
    select: { id: true, projectId: true },
  })

  console.log(
    `Ensured ${projectsWithoutSessions.length} project(s) have bootstrap sessions; ${sessionsWithoutMemory.length} session(s) still awaiting live memory ids.`
  )
}

main()
  .then(() => prisma.$disconnect())
  .catch(error => {
    console.error("backfill-memory failed", error)
    return prisma.$disconnect().finally(() => process.exit(1))
  })
