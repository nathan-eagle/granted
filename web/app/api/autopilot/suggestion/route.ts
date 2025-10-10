import { NextRequest, NextResponse } from "next/server"

import { withApiInstrumentation } from "@/lib/api/middleware"
import { applySuggestion } from "@/lib/agent/suggestions"

export const runtime = "nodejs"

export const POST = withApiInstrumentation(async (request: NextRequest, ctx) => {
  const body = await request.json().catch(() => ({}))
  const projectId: string | undefined = body?.projectId
  const suggestion = body?.suggestion

  if (!projectId || !suggestion?.id || !suggestion?.requirementId) {
    return NextResponse.json({ error: "Invalid suggestion payload" }, { status: 400 })
  }

  try {
    const result = await applySuggestion(projectId, suggestion)
    console.log(JSON.stringify({ level: "info", msg: "suggestion.apply", projectId, suggestionId: suggestion.id, requestId: ctx.requestId }))
    return NextResponse.json(result)
  } catch (error) {
    console.error(JSON.stringify({ level: "error", msg: "suggestion.apply.failed", projectId, suggestionId: suggestion.id, requestId: ctx.requestId, error: (error as Error).message }))
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
})
