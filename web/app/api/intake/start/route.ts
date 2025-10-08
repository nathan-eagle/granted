import { NextRequest, NextResponse } from "next/server"

import { getDefaultUserId } from "@/lib/defaultUser"
import { prisma } from "@/lib/prisma"
import { withApiInstrumentation } from "@/lib/api/middleware"

export const POST = withApiInstrumentation(async (req: NextRequest, ctx) => {
  const body = await req.json().catch(() => ({}))
  const name: string = body?.name ?? "New Grant Project"

  const userId = await getDefaultUserId()
  const project = await prisma.project.create({
    data: {
      name,
      status: "intake",
      userId,
    },
    select: { id: true, name: true, createdAt: true },
  })

  return NextResponse.json({ project, requestId: ctx.requestId })
})
