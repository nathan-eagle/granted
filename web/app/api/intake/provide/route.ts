import { NextRequest, NextResponse } from "next/server"

import { withApiInstrumentation } from "@/lib/api/middleware"
import { runIntake } from "@/lib/agent/orchestrator"

export const POST = withApiInstrumentation(async (req: NextRequest, ctx) => {
  const body = await req.json().catch(() => ({}))
  const projectId: string | undefined = body?.projectId
  const urls: string[] | undefined = body?.urls
  const files: { uploadId?: string; path?: string; name?: string }[] | undefined = body?.files

  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 })
  }

  const coverage = await runIntake({ projectId, urls, files })

  return NextResponse.json({
    projectId,
    coverage,
    requestId: ctx.requestId,
  })
})
