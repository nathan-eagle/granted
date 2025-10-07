import { NextRequest, NextResponse } from "next/server"

import { getDefaultUserId } from "@/lib/defaultUser"
import { prisma } from "@/lib/prisma"
import { withApiInstrumentation } from "@/lib/api/middleware"

export const GET = withApiInstrumentation(async (_req: NextRequest, _ctx) => {
  const projects = await prisma.project.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json({ projects })
})

export const POST = withApiInstrumentation(async (req: NextRequest, _ctx) => {
  const { name } = await req.json()
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 })
  const userId = await getDefaultUserId()
  const project = await prisma.project.create({ data: { name, status: "drafting", userId } })
  return NextResponse.json({ project })
})
