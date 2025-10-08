import { NextRequest, NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { withApiInstrumentation } from "@/lib/api/middleware"
import { startAgentSession } from "@/lib/agent/runtime"
import { prisma } from "@/lib/prisma"
import type { AgentSessionMessage } from "@/lib/agent/sessions"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function normalizeMessages(value: unknown): AgentSessionMessage[] {
  if (!Array.isArray(value)) return []
  return value
    .map(entry => {
      if (!entry || typeof entry !== "object") return null
      const role = (entry as any).role
      const content = (entry as any).content
      if (typeof role !== "string" || typeof content !== "string") return null
      const at = typeof (entry as any).at === "string" ? (entry as any).at : new Date().toISOString()
      if (!role || !content.trim()) return null
      if (!["user", "assistant", "system", "tool"].includes(role)) return null
      return { role: role as AgentSessionMessage["role"], content: content.trim(), at }
    })
    .filter(Boolean) as AgentSessionMessage[]
}

async function fetchToolLogs(projectId: string, limit = 20) {
  const events = await prisma.agentWorkflowRunEvent.findMany({
    where: { run: { projectId } },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      runId: true,
      type: true,
      payload: true,
      createdAt: true,
    },
  })
  return events
}

export const POST = withApiInstrumentation(async (request: NextRequest) => {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const projectId = typeof body?.projectId === "string" ? body.projectId.trim() : ""
  const messages = normalizeMessages(body?.messages)

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 })
  }

  const result = await startAgentSession({ projectId, messages })
  const logs = await fetchToolLogs(projectId)

  return NextResponse.json({
    sessionId: result.sessionId,
    reply: result.reply,
    memoryId: result.memoryId,
    logs,
  })
})
