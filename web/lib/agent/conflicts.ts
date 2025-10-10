import { Prisma } from "@prisma/client"

import { prisma } from "../prisma"

export type ConflictPayload = {
  projectId: string
  key: string
  previous?: Record<string, unknown> | null
  next?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
}

export function buildConflictTopic(entry: { kind?: string | null; kindDetail?: string | null; name?: string | null }) {
  const kind = (entry.kind ?? entry.kindDetail ?? "bundle").toString().toLowerCase()
  const rawName = (entry.name ?? "rfp").toString().toLowerCase()
  const withoutExt = rawName.replace(/\.[a-z0-9]+$/, "")
  const normalized = withoutExt
    .replace(/v\d+(?:\.\d+)?/g, "")
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
  return `${kind}:${normalized}`
}

export function buildConflictKey(entry: { kind?: string | null; kindDetail?: string | null; version?: string | null; release_date?: string | null; name?: string | null }) {
  const topic = buildConflictTopic(entry)
  const version = (entry.version ?? "v0").toString().toLowerCase()
  const release = (entry.release_date ?? "undated").toString().toLowerCase()
  return `${topic}:${version}:${release}`
}

export async function upsertConflictLog(payload: ConflictPayload) {
  const { projectId, key, previous, next, metadata } = payload
  const existing = await prisma.agentConflictLog.findUnique({ where: { projectId_key: { projectId, key } } })
  if (existing) {
    const updateData: Prisma.AgentConflictLogUpdateInput = {
      status: "open",
      resolution: null,
      resolvedAt: null,
    }
    if (previous !== undefined) {
      updateData.previous = (previous ?? Prisma.JsonNull) as Prisma.InputJsonValue | Prisma.JsonNullValueInput
    }
    if (next !== undefined) {
      updateData.next = (next ?? Prisma.JsonNull) as Prisma.InputJsonValue | Prisma.JsonNullValueInput
    }
    if (metadata !== undefined) {
      updateData.metadata = (metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue | Prisma.JsonNullValueInput
    }
    return prisma.agentConflictLog.update({
      where: { id: existing.id },
      data: updateData,
    })
  }

  return prisma.agentConflictLog.create({
    data: {
      projectId,
      key,
      previous: (previous ?? Prisma.JsonNull) as Prisma.InputJsonValue | Prisma.JsonNullValueInput,
      next: (next ?? Prisma.JsonNull) as Prisma.InputJsonValue | Prisma.JsonNullValueInput,
      metadata: (metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue | Prisma.JsonNullValueInput,
    },
  })
}

export async function resolveConflict(projectId: string, key: string, resolution: string) {
  return prisma.agentConflictLog.update({
    where: { projectId_key: { projectId, key } },
    data: {
      status: "resolved",
      resolution,
      resolvedAt: new Date(),
    },
  })
}

export async function listOpenConflicts(projectId: string) {
  return prisma.agentConflictLog.findMany({
    where: { projectId, status: "open" },
    orderBy: { createdAt: "desc" },
  })
}
