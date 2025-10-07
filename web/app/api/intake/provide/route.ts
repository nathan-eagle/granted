import { NextRequest, NextResponse } from "next/server"

import { withApiInstrumentation } from "@/lib/api/middleware"
import { ingestRfpBundle, mineFacts, normalizeRfp, scoreCoverage } from "@/lib/agent/actions"

export const POST = withApiInstrumentation(async (req: NextRequest, ctx) => {
  const body = await req.json().catch(() => ({}))
  const projectId: string | undefined = body?.projectId
  const urls: string[] | undefined = body?.urls
  const files: { uploadId?: string; path?: string; name?: string }[] | undefined = body?.files

  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 })
  }

  let uploadIds: string[] = []
  if ((urls && urls.length) || (files && files.length)) {
    const result = await ingestRfpBundle({ projectId, urls, files })
    uploadIds = result.uploadIds
    if (uploadIds.length) {
      await normalizeRfp({ projectId, uploadIds })
      await mineFacts({ projectId, uploadIds })
    }
  }

  const coverage = await scoreCoverage({ projectId })

  return NextResponse.json({
    projectId,
    coverage,
    requestId: ctx.requestId,
  })
})
