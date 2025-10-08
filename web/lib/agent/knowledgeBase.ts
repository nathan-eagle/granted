import { Prisma } from "@prisma/client"

import { prisma } from "../prisma"
import { client } from "../ai"
import { loadConnectorRegistry, pickConnectorForFile, getFileSearchConnector, type AgentConnectorConfig } from "./connectors"

const VECTOR_PROVIDER = process.env.AGENTKIT_VECTOR_PROVIDER ?? "openai"
const VECTOR_DISABLE_REMOTE = process.env.AGENTKIT_VECTOR_DISABLE_REMOTE === "1"

export async function ensureKnowledgeBase(projectId: string) {
  let record = await prisma.agentKnowledgeBase.findUnique({ where: { projectId } })
  if (record) {
    return record
  }

  const registry = loadConnectorRegistry()
  const fileSearch = getFileSearchConnector(registry)

  let vectorStoreId = `local-${projectId}`
  let status: "pending" | "ready" | "errored" = VECTOR_DISABLE_REMOTE ? "pending" : "ready"
  const metadata: Record<string, unknown> = {
    connectors: serializeConnectors(registry),
  }

  if (!VECTOR_DISABLE_REMOTE && process.env.OPENAI_API_KEY) {
    try {
      const betaClient = (client as any)?.beta
      if (!betaClient?.vectorStores?.create) {
        throw new Error("OpenAI client missing beta.vectorStores API")
      }
      const response = await betaClient.vectorStores.create({
        name: `granted-project-${projectId}`,
        metadata: {
          projectId,
          source: "ingestion",
          connectors: serializeConnectors(registry),
          fileSearchConnector: fileSearch?.id ?? null,
        },
      })
      vectorStoreId = response.id
      status = (response.status as typeof status) ?? "ready"
    } catch (error) {
      status = "errored"
      metadata.error = serializeError(error)
    }
  }

  record = await prisma.agentKnowledgeBase.create({
    data: {
      projectId,
      provider: VECTOR_PROVIDER,
      vectorStoreId,
      status,
      metadata: metadata as unknown as Prisma.InputJsonValue,
    },
  })

  return record
}

export async function getVectorStoreAttachment(projectId: string) {
  const knowledgeBase = await prisma.agentKnowledgeBase.findUnique({ where: { projectId } })
  if (!knowledgeBase) return null
  if (knowledgeBase.vectorStoreId.startsWith("local-")) return null
  return {
    vectorStoreId: knowledgeBase.vectorStoreId,
  }
}

type KnowledgeBaseFileInput = {
  projectId: string
  uploadId?: string | null
  filename?: string | null
  text?: string | null
  source: "file" | "url" | "existing"
  version?: string | null
  releaseDate?: string | null
  connectorOverride?: AgentConnectorConfig | null
  openAiFileId?: string | null
}

export async function registerKnowledgeBaseFile(input: KnowledgeBaseFileInput) {
  const knowledgeBase = await ensureKnowledgeBase(input.projectId)
  const registry = loadConnectorRegistry()
  const connector = input.connectorOverride ?? pickConnectorForFile(registry, input.filename ?? undefined)

  const existing = input.uploadId
    ? await prisma.agentKnowledgeBaseFile.findUnique({
        where: {
          knowledgeBaseId_uploadId: {
            knowledgeBaseId: knowledgeBase.id,
            uploadId: input.uploadId,
          },
        },
      })
    : null

  let vectorFileId = existing?.vectorFileId ?? null
  const metadata: Record<string, unknown> = {
    connectorId: connector?.id ?? null,
    connectorLabel: connector?.label ?? null,
    region: connector?.region ?? null,
    source: input.source,
  }

  const releaseDate = input.releaseDate ? new Date(input.releaseDate) : null

  if (!existing && !VECTOR_DISABLE_REMOTE && connector && process.env.OPENAI_API_KEY && !knowledgeBase.vectorStoreId.startsWith("local-")) {
    try {
      let remoteFileId = input.openAiFileId ?? null
      if (!remoteFileId && input.text) {
        const fileName = input.filename ?? `project-${input.projectId}.txt`
        const uploaded = await client.files.create({
          file: { name: fileName, data: Buffer.from(input.text, "utf8") } as any,
          purpose: "assistants",
        })
        remoteFileId = uploaded.id
      }

      if (remoteFileId) {
        const agentsClient = (client as any)?.agents
        if (agentsClient?.vectorStores?.files?.create) {
          await agentsClient.vectorStores.files.create(knowledgeBase.vectorStoreId, {
            file_id: remoteFileId,
          })
        } else if ((client as any)?.beta?.vectorStores?.files?.create) {
          await (client as any).beta.vectorStores.files.create(knowledgeBase.vectorStoreId, {
            file_id: remoteFileId,
          })
        }
        vectorFileId = remoteFileId
        metadata.openAiFileId = remoteFileId
      }
    } catch (error) {
      metadata.vectorStoreUploadError = serializeError(error)
    }
  }

  if (vectorFileId) {
    metadata.openAiFileId = vectorFileId
  }

  if (existing) {
    const updated = await prisma.agentKnowledgeBaseFile.update({
      where: { id: existing.id },
      data: {
        connectorId: connector?.id ?? null,
        source: input.source,
        version: input.version ?? existing.version,
        releasedAt: releaseDate ?? existing.releasedAt,
        metadata: (metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue | Prisma.JsonNullValueInput,
      },
    })
    return updated
  }

  const created = await prisma.agentKnowledgeBaseFile.create({
    data: {
      knowledgeBaseId: knowledgeBase.id,
      uploadId: input.uploadId ?? null,
      vectorFileId,
      connectorId: connector?.id ?? null,
      source: input.source,
      version: input.version ?? undefined,
      releasedAt: releaseDate ?? undefined,
      metadata: (metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue | Prisma.JsonNullValueInput,
    },
  })

  return created
}

function serializeConnectors(registry: ReturnType<typeof loadConnectorRegistry>) {
  return Object.entries(registry).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (!value) return acc
    acc[key] = {
      id: value.id,
      label: value.label,
      region: value.region,
      formats: value.formats,
      monthlyQuota: value.monthlyQuota ?? null,
    }
    return acc
  }, {})
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack }
  }
  return { message: String(error) }
}
