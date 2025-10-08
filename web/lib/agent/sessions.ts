import { prisma } from "@/lib/prisma"

export type AgentSessionMessage = {
  role: "user" | "assistant" | "system" | "tool"
  content: string
  at: string
}

export type AgentSessionRecord = {
  id: string
  projectId: string
  agentRunId?: string | null
  memoryId?: string | null
  transcript: AgentSessionMessage[]
  createdAt: Date
  updatedAt: Date
}

function normalizeTranscript(value: unknown): AgentSessionMessage[] {
  if (!Array.isArray(value)) return []
  return value
    .map(entry => {
      if (!entry || typeof entry !== "object") return null
      const role = (entry as any).role
      const content = (entry as any).content
      const at = (entry as any).at ?? new Date().toISOString()
      if (role !== "user" && role !== "assistant" && role !== "system" && role !== "tool") return null
      if (typeof content !== "string") return null
      return {
        role,
        content,
        at: typeof at === "string" ? at : new Date().toISOString(),
      }
    })
    .filter(Boolean) as AgentSessionMessage[]
}

export async function createAgentSession(input: {
  projectId: string
  agentRunId?: string | null
  memoryId?: string | null
  transcript?: AgentSessionMessage[]
}) {
  const record = await prisma.agentSession.create({
    data: {
      projectId: input.projectId,
      agentRunId: input.agentRunId ?? null,
      memoryId: input.memoryId ?? null,
      transcriptJson: (input.transcript ?? []).map(message => ({ ...message })),
    },
  })
  return toRecord(record)
}

export async function getAgentSession(sessionId: string) {
  const record = await prisma.agentSession.findUnique({ where: { id: sessionId } })
  return record ? toRecord(record) : null
}

export async function listAgentSessions(projectId: string, limit = 20) {
  const records = await prisma.agentSession.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take: limit,
  })
  return records.map(toRecord)
}

export async function updateAgentSession(sessionId: string, updates: {
  agentRunId?: string | null
  memoryId?: string | null
  appendTranscript?: AgentSessionMessage[]
}) {
  const existing = await prisma.agentSession.findUnique({ where: { id: sessionId } })
  if (!existing) return null
  const transcript = normalizeTranscript(existing.transcriptJson)
  const appended = updates.appendTranscript?.map(entry => ({ ...entry })) ?? []
  const nextTranscript = appended.length ? [...transcript, ...appended] : transcript
  const record = await prisma.agentSession.update({
    where: { id: sessionId },
    data: {
      agentRunId: updates.agentRunId ?? existing.agentRunId,
      memoryId: updates.memoryId ?? existing.memoryId,
      transcriptJson: nextTranscript,
    },
  })
  return toRecord(record)
}

export async function deleteAgentSession(sessionId: string) {
  await prisma.agentSession.delete({ where: { id: sessionId } })
}

function toRecord(record: any): AgentSessionRecord {
  return {
    id: record.id,
    projectId: record.projectId,
    agentRunId: record.agentRunId,
    memoryId: record.memoryId,
    transcript: normalizeTranscript(record.transcriptJson),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}
