import { NextRequest, NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { withApiInstrumentation } from "@/lib/api/middleware"
import { continueAgentSession } from "@/lib/agent/runtime"
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

async function handle(request: NextRequest, context: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const sessionId = context.params?.id
  if (!sessionId) {
    return NextResponse.json({ error: "session id missing" }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const messages = normalizeMessages(body?.messages)

  if (!messages.length) {
    return NextResponse.json({ error: "messages array required" }, { status: 400 })
  }

  const result = await continueAgentSession({ sessionId, messages })
  const persisted = await prisma.agentSession.findUnique({
    where: { id: result.sessionId },
    select: { projectId: true, transcriptJson: true },
  })

  const projectId = persisted?.projectId ?? null
  const logs = projectId ? await fetchToolLogs(projectId) : []

  return NextResponse.json({
    sessionId: result.sessionId,
    reply: result.reply,
    memoryId: result.memoryId,
    transcript: persisted?.transcriptJson ?? [],
    logs,
  })
}

export function POST(request: NextRequest, context: { params: { id: string } }) {
  const instrumented = withApiInstrumentation(req => handle(req, context))
  return instrumented(request)
}
