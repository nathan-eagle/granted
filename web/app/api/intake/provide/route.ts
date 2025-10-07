import { NextRequest, NextResponse } from "next/server"

import { withApiInstrumentation } from "@/lib/api/middleware"
import { executeAgentAction, type AgentActionInput } from "@/lib/agent/agentkit"

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
    const result = await executeAgentAction(
      "ingest_rfp_bundle",
      { projectId, urls, files } satisfies AgentActionInput<"ingest_rfp_bundle">
    )
    uploadIds = result.uploadIds
    if (uploadIds.length) {
      const sharedArgs = { projectId, uploadIds }
      await executeAgentAction("normalize_rfp", sharedArgs as AgentActionInput<"normalize_rfp">)
      await executeAgentAction("mine_facts", sharedArgs as AgentActionInput<"mine_facts">)
    }
  }

  const coverage = await executeAgentAction(
    "score_coverage",
    { projectId } as AgentActionInput<"score_coverage">
  )

  return NextResponse.json({
    projectId,
    coverage,
    requestId: ctx.requestId,
  })
})
