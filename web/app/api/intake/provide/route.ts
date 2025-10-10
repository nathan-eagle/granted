import { NextRequest, NextResponse } from "next/server"

import { withApiInstrumentation } from "@/lib/api/middleware"
import { agentkit } from "@/lib/agentkit/client"
import { runIntake } from "@/lib/agent/orchestrator"
import type { AgentEvent } from "@/lib/agent/events"
type ConflictEvent = Extract<AgentEvent, { type: "conflict.found" }>

export const POST = withApiInstrumentation(async (req: NextRequest, ctx) => {
  const body = await req.json().catch(() => ({}))
  const projectId: string | undefined = body?.projectId
  const urls: string[] | undefined = body?.urls
  const files: { uploadId?: string; path?: string; name?: string }[] | undefined = body?.files

  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 })
  }

  const capturedEvents: ConflictEvent[] = []
  const unsubscribe = agentkit.events.subscribe("conflict.found", event => {
    if (event.payload.projectId === projectId) {
      capturedEvents.push(event)
    }
  })

  try {
    const ingestion = await agentkit.actions.invoke("ingest_rfp_bundle", {
      projectId,
      urls,
      files,
    })

    const coverage = await runIntake({ projectId, uploadIds: ingestion.uploadIds })

    return NextResponse.json({
      projectId,
      coverage,
      uploadIds: ingestion.uploadIds,
      conflicts: capturedEvents.map(event => ({
        key: event.payload.key,
        previous: event.payload.previous ?? null,
        next: event.payload.next ?? null,
      })),
      requestId: ctx.requestId,
    })
  } finally {
    unsubscribe()
  }
})
