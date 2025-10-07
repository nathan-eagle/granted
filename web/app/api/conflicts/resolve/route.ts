import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { withApiInstrumentation } from "@/lib/api/middleware"
import { scoreCoverage } from "@/lib/agent/actions"

export const POST = withApiInstrumentation(async (req: NextRequest) => {
  const body = await req.json().catch(() => ({}))
  const { projectId, key, resolution } = body || {}
  if (!projectId || !key) {
    return NextResponse.json({ error: "projectId and key required" }, { status: 400 })
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { conflictLogJson: true, rfpBundleMeta: true },
  })

  if (!project) return NextResponse.json({ error: "project not found" }, { status: 404 })

  const updatedConflictLog = Array.isArray(project.conflictLogJson)
    ? project.conflictLogJson.map(entry => {
        if (!entry || typeof entry !== "object") return entry
        const record = entry as Record<string, unknown>
        const entryKey = record.key
        if (typeof entryKey === "string" && entryKey === key) {
          return { ...record, resolved: resolution ?? "accepted" }
        }
        return entry
      })
    : project.conflictLogJson

  await prisma.project.update({
    where: { id: projectId },
    data: { conflictLogJson: updatedConflictLog as Prisma.InputJsonValue },
  })

  const coverage = await scoreCoverage({ projectId })

  return NextResponse.json({ status: "ok", coverage })
})
