import { NextRequest, NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { withApiInstrumentation } from "@/lib/api/middleware"
import { agentKitModels } from "@/lib/agent/agentkit.config"
import { startAgentSession, extractText } from "@/lib/agent/runtime"
import {
  ensureProjectAgentSession,
  updateAgentSession,
  type AgentSessionMessage,
} from "@/lib/agent/sessions"
import { prisma } from "@/lib/prisma"
import { client } from "@/lib/ai"
import { ensureKnowledgeBase } from "@/lib/agent/knowledgeBase"
import { callAgentActionWithAgents } from "@/lib/agent/runner"
import {
  SUMMARY_SECTION_KEY,
  SUMMARY_SECTION_TITLE,
  loadDraftSnapshot,
  type DraftSnapshot,
} from "@/lib/agent/draft"
import { recordMetric } from "@/lib/observability/metrics"
import { simulateCompliance } from "@/lib/compliance/simulator"
import type { CoverageV1, FactsV1, RfpNormV1, SectionDraftV1 } from "@/lib/contracts"
const DEFAULT_SYSTEM_PROMPT =
  "You are a grant-writing autopilot. Draft a concise summary from the available materials."
const DEFAULT_USER_PROMPT = "Generate a project summary and outline next steps."

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export const POST = withApiInstrumentation(async (request: NextRequest) => {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const projectId = typeof body?.projectId === "string" ? body.projectId.trim() : ""
  const rawMessages = normalizeMessages(body?.messages)
  const text = typeof body?.text === "string" ? body.text.trim() : ""
  const allowWebSearch = coerceBoolean(body?.allowWebSearch)

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 })
  }

  const messageTimeline: AgentSessionMessage[] = [...rawMessages]
  if (text) {
    messageTimeline.push({
      role: "user",
      content: text,
      at: new Date().toISOString(),
    })
  }
  if (!messageTimeline.length) {
    const now = new Date().toISOString()
    messageTimeline.push(
      { role: "system", content: DEFAULT_SYSTEM_PROMPT, at: now },
      { role: "user", content: DEFAULT_USER_PROMPT, at: now },
    )
  }

  await persistAllowWebSearchPreference(projectId, allowWebSearch)

  const accepts = request.headers.get("accept") ?? ""
  const wantsStream = accepts.includes("text/event-stream") || request.headers.get("x-stream") === "1"

  if (wantsStream) {
    return streamAgentSession({ projectId, messages: messageTimeline, allowWebSearch })
  }

  const result = await startAgentSession({ projectId, messages: messageTimeline, allowWebSearch })
  const draft = await loadDraftSnapshot(projectId)
  const logs = await fetchToolLogs(projectId)

  return NextResponse.json({
    sessionId: result.sessionId,
    reply: result.reply,
    memoryId: result.memoryId,
    draft,
    logs,
  })
})

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

function formatToolError(action: string, error: unknown) {
  if (error instanceof Error) {
    return `${action} failed: ${error.message}`
  }
  return `${action} failed: ${String(error)}`
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

async function persistAllowWebSearchPreference(projectId: string, allow: boolean) {
  try {
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { meta: true } })
    if (!project) return
    const meta = project.meta && typeof project.meta === "object" && !Array.isArray(project.meta)
      ? { ...(project.meta as Record<string, unknown>), allowWebSearch: allow }
      : { allowWebSearch: allow }
    await prisma.project.update({ where: { id: projectId }, data: { meta } })
  } catch (error) {
    console.warn("[agent-session] failed to persist allowWebSearch", error)
  }
}


async function streamAgentSession({
  projectId,
  messages,
  allowWebSearch,
}: {
  projectId: string
  messages: AgentSessionMessage[]
  allowWebSearch: boolean
}) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      meta: true,
      factsJson: true,
      rfpNormJson: true,
      coverageJson: true,
      uploads: { orderBy: { createdAt: "desc" }, select: { id: true, filename: true, kind: true } },
      sections: {
        orderBy: { order: "asc" },
        select: { id: true, key: true, title: true, contentMd: true, formatLimits: true },
      },
    },
  })

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const projectMetaRecord =
    project.meta && typeof project.meta === "object" && !Array.isArray(project.meta)
      ? (project.meta as Record<string, unknown>)
      : {}
  const orgUrl =
    typeof projectMetaRecord?.orgUrl === "string"
      ? projectMetaRecord.orgUrl
      : typeof projectMetaRecord?.orgSite === "string"
        ? projectMetaRecord.orgSite
        : null
  const projectIdea =
    typeof projectMetaRecord?.projectIdea === "string"
      ? projectMetaRecord.projectIdea
      : typeof projectMetaRecord?.idea === "string"
        ? projectMetaRecord.idea
        : null

  const knowledgeBase = await ensureKnowledgeBase(projectId)
  const vectorStoreId = knowledgeBase?.vectorStoreId ?? ""
  const vectorStoreReady =
    !vectorStoreId || vectorStoreId.startsWith("local-") || knowledgeBase?.status === "ready"
  let deferRfpTools = !vectorStoreReady

  const sessionRecord = await ensureProjectAgentSession(projectId)
  const encoder = new TextEncoder()
  const startedAt = Date.now()
  const primaryModel = agentKitModels.fast
  const runRecord = await prisma.agentWorkflowRun.create({
    data: {
      workflowId: "agent-session-stream",
      projectId,
      agentSessionId: sessionRecord.id,
      status: "running",
      input: { allowWebSearch, sessionId: sessionRecord.id, model: primaryModel },
      startedAt: new Date(startedAt),
    },
  })
  const toolStats: Array<{ action: string; durationMs: number; status: "ok" | "error"; label?: string }> = []
  let firstTokenAt: number | null = null

  const markPhase = async (step: string, label: string) => {
    await recordMetric({
      event: "session.phase",
      projectId,
      runId: runRecord.id,
      action: step,
      status: "info",
      metadata: { label },
    })
  }

  const runTool = async <Output>(
    action: "normalize_rfp" | "mine_facts" | "score_coverage" | "draft_section" | "tighten_section",
    input: Record<string, unknown>,
    label: string,
  ): Promise<Output> => {
    const toolStart = Date.now()
    try {
      const result = await callAgentActionWithAgents(action as any, input as any)
      const durationMs = Date.now() - toolStart
      toolStats.push({ action, durationMs, status: "ok", label })
      await recordMetric({
        event: "session.tool",
        projectId,
        runId: runRecord.id,
        action,
        status: "ok",
        durationMs,
        metadata: { label },
      })
      return result as Output
    } catch (error) {
      const durationMs = Date.now() - toolStart
      toolStats.push({ action, durationMs, status: "error", label })
      await recordMetric({
        event: "session.tool",
        projectId,
        runId: runRecord.id,
        action,
        status: "error",
        durationMs,
        metadata: { label, error: error instanceof Error ? error.message : String(error) },
      })
      throw error
    }
  }

  const extractSettings = (value: any): Record<string, unknown> => {
    if (!value || typeof value !== "object") return {}
    if ((value as any).settings && typeof (value as any).settings === "object") {
      return (value as any).settings as Record<string, unknown>
    }
    return value as Record<string, unknown>
  }

  const buildComplianceSnapshot = (formatLimits: any, markdown: string) => {
    if (formatLimits && typeof formatLimits === "object" && (formatLimits as any).result) {
      const result = (formatLimits as any).result
      const wordCount = Number(result?.wordCount ?? result?.words ?? markdown.split(/\s+/).filter(Boolean).length)
      const estimatedPages = Number(result?.estimatedPages ?? result?.pages ?? simulateCompliance(markdown, extractSettings(formatLimits)).estimatedPages)
      const status = result?.status === "overflow" || result?.status === "warning" ? "overflow" : "ok"
      return { status, wordCount, estimatedPages }
    }
    const settings = extractSettings(formatLimits)
    const simulated = simulateCompliance(markdown, settings)
    return { status: simulated.status, wordCount: simulated.wordCount, estimatedPages: Number(simulated.estimatedPages.toFixed(2)) }
  }

  const finalizeRun = async (
    status: "succeeded" | "failed",
    payload: Record<string, unknown>,
  ) => {
    const ttfdValue = typeof (payload as any)?.ttfd_ms === "number" ? (payload as any).ttfd_ms : null
    const metrics = {
      ttft_ms: firstTokenAt ? firstTokenAt - startedAt : null,
      ttfd_ms: ttfdValue,
    }
    const totalsByAction = new Map<
      string,
      { count: number; totalDurationMs: number; errors: number }
    >()
    for (const stat of toolStats) {
      const existing = totalsByAction.get(stat.action) ?? { count: 0, totalDurationMs: 0, errors: 0 }
      existing.count += 1
      existing.totalDurationMs += stat.durationMs
      if (stat.status === "error") {
        existing.errors += 1
      }
      totalsByAction.set(stat.action, existing)
    }
    const toolSummary = {
      totalCalls: toolStats.length,
      errorCount: toolStats.filter(stat => stat.status === "error").length,
      byAction: Object.fromEntries(
        Array.from(totalsByAction.entries()).map(([action, stats]) => [
          action,
          {
            count: stats.count,
            totalDurationMs: stats.totalDurationMs,
            averageDurationMs: stats.count ? Number((stats.totalDurationMs / stats.count).toFixed(2)) : 0,
            errors: stats.errors,
          },
        ]),
      ),
    }
    await prisma.agentWorkflowRun.update({
      where: { id: runRecord.id },
      data: {
        status,
        completedAt: new Date(),
        metrics,
        result: {
          ...payload,
          allowWebSearch,
          toolStats,
          toolSummary,
          metrics,
          model: primaryModel,
          sessionId: sessionRecord.id,
        },
      },
    })
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, payload: unknown) => {
        const data = `event: ${event}
data: ${JSON.stringify(payload)}

`
        controller.enqueue(encoder.encode(data))
      }

      const sendStatus = (step: string, label: string) => {
        send("status", { step, label })
        markPhase(step, label).catch(() => undefined)
      }

      let summaryBuffer = ""
      let latestCoverage =
        typeof (project.coverageJson as any)?.score === "number" ? (project.coverageJson as any).score : undefined

      try {
        send("session", { sessionId: sessionRecord.id, projectId, allowWebSearch, context: { orgUrl, projectIdea } })
        sendStatus("ingest", "Collecting project materials…")

        const uploads = project.uploads.map(upload => ({
          id: upload.id,
          filename: upload.filename,
          kind: upload.kind,
        }))
        send("uploads", { uploads })

        sendStatus("draft_summary", allowWebSearch ? "Drafting summary (web on)…" : "Drafting summary…")
        try {
          const contextPieces: string[] = []
          if (project.factsJson) {
            contextPieces.push(`Known facts: ${JSON.stringify(project.factsJson).slice(0, 2000)}`)
          }
          if (project.rfpNormJson) {
            const rfpOutline = Array.isArray((project.rfpNormJson as any)?.sections)
              ? (project.rfpNormJson as any).sections
              : project.rfpNormJson
            contextPieces.push(`RFP outline: ${JSON.stringify(rfpOutline).slice(0, 2000)}`)
          }
          if (uploads.length) {
            contextPieces.push(`Uploads: ${uploads.map(u => `${u.kind}:${u.filename}`).join(", ")}`)
          }
          if (orgUrl) {
            contextPieces.push(`Organization site: ${orgUrl}`)
          }
          if (projectIdea) {
            contextPieces.push(`Project idea: ${projectIdea}`)
          }
          if (!allowWebSearch) {
            contextPieces.push("Web search disabled unless toggled on.")
          }
          const contextText = contextPieces.length ? `\n${contextPieces.join("\n\n")}` : ""

          const responseStream = await client.responses.stream({
            model: agentKitModels.fast,
            input: [
              { role: "system", content: DEFAULT_SYSTEM_PROMPT },
              {
                role: "user",
                content: `Project name: ${project.name}${contextText}`,
              },
            ],
          } as any)

          for await (const event of responseStream) {
            if (event.type === "response.output_text.delta") {
              const delta = event.delta ?? ""
              if (delta) {
                summaryBuffer += delta
                if (!firstTokenAt) {
                  firstTokenAt = Date.now()
                  await recordMetric({
                    event: "session.ttft",
                    projectId,
                    runId: runRecord.id,
                    durationMs: firstTokenAt - startedAt,
                  })
                }
                send("section_delta", {
                  key: SUMMARY_SECTION_KEY,
                  title: SUMMARY_SECTION_TITLE,
                  delta,
                })
              }
            }
            if (event.type === "response.completed") {
              const text = extractText(event.response)
              if (text) {
                summaryBuffer = text
              }
            }
          }
        } catch (error) {
          const message = formatToolError("summary", error)
          send("error", { message })
          await finalizeRun("failed", { error: message })
          controller.close()
          return
        }

        const initialSummaryRecord = project.sections.find(section => section.key === SUMMARY_SECTION_KEY)
        const summarySettings = extractSettings(initialSummaryRecord?.formatLimits)
        const summaryCompliance = buildComplianceSnapshot(initialSummaryRecord?.formatLimits, summaryBuffer)
        send("section_complete", {
          key: SUMMARY_SECTION_KEY,
          title: SUMMARY_SECTION_TITLE,
          markdown: summaryBuffer,
          compliance: summaryCompliance,
          settings: summarySettings,
        })

        const uploadIds = uploads.map(upload => upload.id).filter((id): id is string => Boolean(id))

        if (uploadIds.length) {
          if (deferRfpTools) {
            sendStatus("vector_store", "File search indexing… drafting from org site first.")
          } else {
            sendStatus("normalize", "Normalizing requirements…")
            try {
              const rfpNorm = await runTool<RfpNormV1>("normalize_rfp", { projectId, uploadIds }, "normalize RFP")
              send("rfp_norm", { sectionCount: Array.isArray(rfpNorm.sections) ? rfpNorm.sections.length : 0 })
            } catch (error) {
              send("error", { message: formatToolError("normalize_rfp", error) })
            }

            sendStatus("facts", "Mining facts…")
            try {
              const facts = await runTool<FactsV1>("mine_facts", { projectId, uploadIds }, "mine facts")
              const teamCount = Array.isArray((facts as any)?.team) ? (facts as any).team.length : 0
              send("facts", { teamCount })
            } catch (error) {
              send("error", { message: formatToolError("mine_facts", error) })
            }
          }
        }

        sendStatus("coverage", "Scoring coverage…")
        try {
          const coverage = await runTool<CoverageV1>("score_coverage", { projectId }, "score coverage")
          latestCoverage = coverage.score
          send("coverage", { score: coverage.score })
        } catch (error) {
          send("error", { message: formatToolError("score_coverage", error) })
        }

        const sectionsFromDb = await prisma.section.findMany({
          where: { projectId },
          orderBy: { order: "asc" },
          select: { key: true, title: true, formatLimits: true },
        })

        const summaryRecord = sectionsFromDb.find(section => section.key === SUMMARY_SECTION_KEY)
        if (summaryRecord) {
          sendStatus("draft_summary", "Refining summary…")
          send("section_start", { key: SUMMARY_SECTION_KEY, title: summaryRecord.title })
          try {
            const summaryResult = await runTool<SectionDraftV1>(
              "draft_section",
              {
                projectId,
                section_key: SUMMARY_SECTION_KEY,
              },
              "draft summary",
            )
            summaryBuffer = summaryResult.full_markdown ?? summaryBuffer
            const compliance = buildComplianceSnapshot(summaryRecord.formatLimits, summaryBuffer)
            const summarySettings = extractSettings(summaryRecord.formatLimits)
            send("section_complete", {
              key: SUMMARY_SECTION_KEY,
              title: summaryRecord.title ?? SUMMARY_SECTION_TITLE,
              markdown: summaryBuffer,
              compliance,
              settings: summarySettings,
            })
            const coverage = await runTool<CoverageV1>("score_coverage", { projectId }, "score coverage (summary)")
            latestCoverage = coverage.score
            send("coverage", { score: coverage.score, sectionKey: SUMMARY_SECTION_KEY })
          } catch (error) {
            send("error", { message: formatToolError(`draft_section(${SUMMARY_SECTION_KEY})`, error) })
          }
        }

        for (const sectionRecord of sectionsFromDb.filter(section => section.key !== SUMMARY_SECTION_KEY)) {
          sendStatus("draft_section", `Drafting ${sectionRecord.title}…`)
          send("section_start", { key: sectionRecord.key, title: sectionRecord.title })
          try {
            const sectionResult = await runTool<SectionDraftV1>(
              "draft_section",
              {
                projectId,
                section_key: sectionRecord.key,
              },
              `draft ${sectionRecord.title}`,
            )
            const markdown = sectionResult.full_markdown ?? ""
            const settings = extractSettings(sectionRecord.formatLimits)
            const compliance = buildComplianceSnapshot(sectionRecord.formatLimits, markdown)
            send("section_complete", {
              key: sectionRecord.key,
              title: sectionRecord.title,
              markdown,
              compliance,
              paragraph_meta: sectionResult.paragraph_meta ?? null,
            })
            const coverage = await runTool<CoverageV1>("score_coverage", { projectId }, `score coverage (${sectionRecord.key})`)
            latestCoverage = coverage.score
            send("coverage", { score: coverage.score, sectionKey: sectionRecord.key })
          } catch (error) {
            send("error", { message: formatToolError(`draft_section(${sectionRecord.key})`, error) })
          }
        }

        if (deferRfpTools && uploadIds.length) {
          const refreshedKnowledgeBase = await ensureKnowledgeBase(projectId)
          const refreshedVectorStoreId = refreshedKnowledgeBase?.vectorStoreId ?? ""
          const refreshedReady =
            !refreshedVectorStoreId ||
            refreshedVectorStoreId.startsWith("local-") ||
            refreshedKnowledgeBase?.status === "ready"

          if (refreshedReady) {
            sendStatus("normalize", "File search ready — backfilling requirements…")
            try {
              const rfpNorm = await runTool<RfpNormV1>("normalize_rfp", { projectId, uploadIds }, "normalize RFP (patch)")
              send("rfp_norm", { sectionCount: Array.isArray(rfpNorm.sections) ? rfpNorm.sections.length : 0 })
            } catch (error) {
              send("error", { message: formatToolError("normalize_rfp", error) })
            }

            try {
              const facts = await runTool<FactsV1>("mine_facts", { projectId, uploadIds }, "mine facts (patch)")
              const teamCount = Array.isArray((facts as any)?.team) ? (facts as any).team.length : 0
              send("facts", { teamCount })
            } catch (error) {
              send("error", { message: formatToolError("mine_facts", error) })
            }

            try {
              const coverage = await runTool<CoverageV1>("score_coverage", { projectId }, "score coverage (patch)")
              latestCoverage = coverage.score
              send("coverage", { score: coverage.score, patched: true })
            } catch (error) {
              send("error", { message: formatToolError("score_coverage", error) })
            }

            deferRfpTools = false
          } else {
            sendStatus(
              "vector_store",
              "File search still indexing — RFP details will be patched on the next tighten.",
            )
          }
        }

        const finalDraft = await loadDraftSnapshot(projectId, summaryBuffer, latestCoverage)
        send("done", finalDraft)
        sendStatus("done", "First draft ready")
        controller.close()

        const now = new Date().toISOString()
        const transcriptUpdates: AgentSessionMessage[] = []
        if (messages.length) {
          transcriptUpdates.push(...messages)
        }
        if (summaryBuffer) {
          transcriptUpdates.push({ role: "assistant", content: summaryBuffer, at: now })
        }
        if (transcriptUpdates.length) {
          await updateAgentSession(sessionRecord.id, { appendTranscript: transcriptUpdates })
        }

        const metaUpdates =
          finalDraft.sections.length > 0
            ? {
                lastSummary: summaryBuffer,
                lastDraftUpdatedAt: now,
                allowWebSearch,
              }
            : { allowWebSearch }

        await prisma.project.update({
          where: { id: projectId },
          data: {
            meta: {
              ...(project.meta && typeof project.meta === "object" && !Array.isArray(project.meta)
                ? (project.meta as Record<string, unknown>)
                : {}),
              ...metaUpdates,
            } as any,
          },
        })

        const completedAt = Date.now()
        const ttfd = completedAt - startedAt
        await recordMetric({
          event: "session.ttfd",
          projectId,
          runId: runRecord.id,
          durationMs: ttfd,
          metadata: { coverage: finalDraft.coverage },
        })
        await finalizeRun("succeeded", { ttfd_ms: ttfd, coverage: finalDraft.coverage })
      } catch (error) {
        const message = formatToolError("session", error)
        send("error", { message })
        await recordMetric({
          event: "session.error",
          projectId,
          runId: runRecord.id,
          status: "error",
          metadata: { message },
        })
        await finalizeRun("failed", { error: message })
        controller.close()
      }
    },
  })

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
