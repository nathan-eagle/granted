import { NextRequest, NextResponse } from "next/server"

import { Prisma } from "@prisma/client"

import { withApiInstrumentation } from "@/lib/api/middleware"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

function coerceString(value: unknown) {
  if (typeof value !== "string") return ""
  return value.trim()
}

async function handlePatch(request: NextRequest, context: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const projectId = context.params?.id
  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const orgUrlRaw = coerceString(body?.orgUrl)
  const projectIdeaRaw = coerceString(body?.projectIdea)

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { meta: true },
  })

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const existingMeta =
    project.meta && typeof project.meta === "object" && !Array.isArray(project.meta)
      ? (project.meta as Record<string, unknown>)
      : {}

  const nextMeta = { ...existingMeta }
  if (orgUrlRaw || Object.prototype.hasOwnProperty.call(body ?? {}, "orgUrl")) {
    if (orgUrlRaw) {
      nextMeta.orgUrl = orgUrlRaw
      nextMeta.orgSite = orgUrlRaw
    } else {
      delete nextMeta.orgUrl
      delete nextMeta.orgSite
    }
  }
  if (projectIdeaRaw || Object.prototype.hasOwnProperty.call(body ?? {}, "projectIdea")) {
    if (projectIdeaRaw) {
      nextMeta.projectIdea = projectIdeaRaw
      nextMeta.idea = projectIdeaRaw
    } else {
      delete nextMeta.projectIdea
      delete nextMeta.idea
    }
  }

  await prisma.project.update({
    where: { id: projectId },
    data: { meta: nextMeta as Prisma.InputJsonValue },
  })

  return NextResponse.json({ ok: true, meta: nextMeta })
}

export function PATCH(request: NextRequest, context: { params: { id: string } }) {
  const instrumented = withApiInstrumentation(req => handlePatch(req, context))
  return instrumented(request)
}
