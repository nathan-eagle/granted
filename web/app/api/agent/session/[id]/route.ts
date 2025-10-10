import { NextRequest, NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { withApiInstrumentation } from "@/lib/api/middleware"
import { continueAgentSession } from "@/lib/agent/runtime"
import { callAgentActionWithAgents } from "@/lib/agent/runner"
import type { AgentActionInput } from "@/lib/agent/agentkit"
import { prisma } from "@/lib/prisma"
import type { AgentSessionMessage } from "@/lib/agent/sessions"
import { buildDraftFromProject, loadDraftSnapshot } from "@/lib/agent/draft"

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

async function handleGet(request: NextRequest, context: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const sessionId = context.params?.id
  if (!sessionId) {
    return NextResponse.json({ error: "session id missing" }, { status: 400 })
  }

  const persisted = await prisma.agentSession.findUnique({
    where: { id: sessionId },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          agentSessionId: true,
          meta: true,
          coverageJson: true,
          uploads: { orderBy: { createdAt: "desc" } },
          sections: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              key: true,
              title: true,
              contentMd: true,
              coverage: true,
              formatLimits: true,
              contentJson: true,
            },
          },
        },
      },
    },
  })

  if (!persisted?.project) {
    return NextResponse.json({ error: "session not found" }, { status: 404 })
  }

  const project = persisted.project
  const allowWebSearch = Boolean((project.meta as any)?.allowWebSearch)
  const projectMeta = project.meta && typeof project.meta === "object" && !Array.isArray(project.meta) ? (project.meta as Record<string, unknown>) : {}
  const workspaceContext = {
    orgUrl:
      typeof projectMeta?.orgUrl === "string"
        ? projectMeta.orgUrl
        : typeof projectMeta?.orgSite === "string"
          ? projectMeta.orgSite
          : null,
    projectIdea:
      typeof projectMeta?.projectIdea === "string"
        ? projectMeta.projectIdea
        : typeof projectMeta?.idea === "string"
          ? projectMeta.idea
          : null,
  }
  const draft = buildDraftFromProject({
    id: project.id,
    meta: project.meta,
    coverageJson: project.coverageJson,
    sections: project.sections.map(section => ({
      key: section.key,
      title: section.title,
      contentMd: section.contentMd ?? null,
      formatLimits: section.formatLimits ?? null,
      contentJson: section.contentJson ?? null,
    })),
  })

  return NextResponse.json({
    sessionId: persisted.id,
    projectId: project.id,
    transcript: persisted.transcriptJson ?? [],
    draft,
    uploads: project.uploads,
    coverage: project.coverageJson ?? null,
    preferences: {
      allowWebSearch,
    },
    context: workspaceContext,
  })
}

async function handlePost(request: NextRequest, context: { params: { id: string } }) {
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
  const text = typeof body?.text === "string" ? body.text.trim() : ""
  if (text) {
    messages.push({
      role: "user",
      content: text,
      at: new Date().toISOString(),
    })
  }
  const action = typeof body?.action === "string" ? body.action.trim() : ""
  const sectionKey = typeof body?.sectionKey === "string" ? body.sectionKey.trim() : ""
  const allowWebSearchProvided = Object.prototype.hasOwnProperty.call(body ?? {}, "allowWebSearch")
  const allowWebSearch = allowWebSearchProvided ? coerceBoolean(body?.allowWebSearch) : undefined

  if (!messages.length && !action) {
    return NextResponse.json({ error: "messages or action required" }, { status: 400 })
  }

  const sessionRecord = await prisma.agentSession.findUnique({
    where: { id: sessionId },
    select: { projectId: true, transcriptJson: true },
  })

  if (!sessionRecord?.projectId) {
    return NextResponse.json({ error: "session not found" }, { status: 404 })
  }

  const projectId = sessionRecord.projectId

  if (action === "tighten") {
    if (!sectionKey) {
      return NextResponse.json({ error: "sectionKey required for tighten" }, { status: 400 })
    }
    const sectionRecord = await prisma.section.findFirst({
      where: { projectId, key: sectionKey },
      select: { formatLimits: true },
    })
    if (!sectionRecord) {
      return NextResponse.json({ error: "section not found" }, { status: 404 })
    }
    const simulatorSettings = extractSimulatorSettings(sectionRecord.formatLimits)
    const tightenInput: AgentActionInput<"tighten_section"> = {
      projectId,
      section_key: sectionKey,
      simulator: simulatorSettings,
    }
    const tightenResult = await callAgentActionWithAgents("tighten_section", tightenInput)
    const coverage = await callAgentActionWithAgents("score_coverage", { projectId })
    if (allowWebSearchProvided) {
      await persistAllowWebSearchPreference(projectId, allowWebSearch ?? false)
    }
    const [draft, logs] = await Promise.all([
      loadDraftSnapshot(projectId),
      fetchToolLogs(projectId),
    ])

    return NextResponse.json({
      sessionId,
      tighten: {
        sectionKey,
        markdown: tightenResult.markdown,
        compliance: tightenResult.compliance,
        settings: simulatorSettings,
      },
      coverage,
      draft,
      logs,
      transcript: sessionRecord.transcriptJson ?? [],
    })
  }

  const result = await continueAgentSession({ sessionId, messages, allowWebSearch })
  const persisted = await prisma.agentSession.findUnique({
    where: { id: result.sessionId },
    select: { projectId: true, transcriptJson: true },
  })

  if (persisted?.projectId && allowWebSearchProvided) {
    await persistAllowWebSearchPreference(persisted.projectId, allowWebSearch ?? false)
  }

  const logs = persisted?.projectId ? await fetchToolLogs(persisted.projectId) : []
  const draft = persisted?.projectId ? await loadDraftSnapshot(persisted.projectId) : null

  return NextResponse.json({
    sessionId: result.sessionId,
    reply: result.reply,
    memoryId: result.memoryId,
    transcript: persisted?.transcriptJson ?? [],
    draft,
    logs,
  })
}

function extractSimulatorSettings(formatLimits: unknown): {
  font?: string
  size?: number
  spacing?: string
  margins?: number
  hard_word_limit?: number
  soft_page_limit?: number
} {
  const src =
    formatLimits && typeof formatLimits === "object" && !Array.isArray(formatLimits)
      ? ((formatLimits as any).settings && typeof (formatLimits as any).settings === "object"
          ? (formatLimits as any).settings
          : formatLimits)
      : {}
  const result: {
    font?: string
    size?: number
    spacing?: string
    margins?: number
    hard_word_limit?: number
    soft_page_limit?: number
  } = {}
  if (src.font && typeof src.font === "string") {
    result.font = src.font
  }
  if (typeof src.size === "number" && Number.isFinite(src.size)) {
    result.size = src.size
  }
  if (src.spacing && typeof src.spacing === "string") {
    result.spacing = src.spacing
  }
  if (typeof src.margins === "number" && Number.isFinite(src.margins)) {
    result.margins = src.margins
  }
  if (typeof src.hard_word_limit === "number" && Number.isFinite(src.hard_word_limit)) {
    result.hard_word_limit = src.hard_word_limit
  }
  if (typeof src.soft_page_limit === "number" && Number.isFinite(src.soft_page_limit)) {
    result.soft_page_limit = src.soft_page_limit
  }
  return result
}

export function POST(request: NextRequest, context: { params: { id: string } }) {
  const instrumented = withApiInstrumentation(req => handlePost(req, context))
  return instrumented(request)
}

export function GET(request: NextRequest, context: { params: { id: string } }) {
  const instrumented = withApiInstrumentation(req => handleGet(req, context))
  return instrumented(request)
}

function coerceBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (["true", "1", "yes", "on"].includes(normalized)) return true
    if (["false", "0", "no", "off"].includes(normalized)) return false
  }
  if (typeof value === "number") return value !== 0
  return false
}

async function persistAllowWebSearchPreference(projectId: string, allow: boolean) {
  try {
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { meta: true } })
    if (!project) return
    const meta = project.meta && typeof project.meta === "object" && !Array.isArray(project.meta)
      ? { ...(project.meta as Record<string, unknown>), allowWebSearch: allow }
      : { allowWebSearch: allow }
    await prisma.project.update({ where: { id: projectId }, data: { meta } })
  } catch (error) {
    console.warn("[agent-session] update preference failed", error)
  }
}
