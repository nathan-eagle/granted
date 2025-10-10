import { NextRequest, NextResponse } from "next/server"

import { withApiInstrumentation } from "@/lib/api/middleware"
import { callAgentActionWithAgents } from "@/lib/agent/runner"
import { resolveConflict as resolveConflictRecord } from "@/lib/agent/conflicts"

export const POST = withApiInstrumentation(async (req: NextRequest) => {
  const body = await req.json().catch(() => ({}))
  const { projectId, key, resolution } = body || {}
  if (!projectId || !key) {
    return NextResponse.json({ error: "projectId and key required" }, { status: 400 })
  }

  try {
    await resolveConflictRecord(projectId, key, resolution ?? "accepted")
  } catch (error) {
    return NextResponse.json({ error: "conflict not found" }, { status: 404 })
  }

  const coverage = await callAgentActionWithAgents("score_coverage", { projectId })

  return NextResponse.json({ status: "ok", coverage })
})
