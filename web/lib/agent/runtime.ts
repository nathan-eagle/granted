import { client } from "@/lib/ai"
import { agentKitRuntimeConfig } from "./agentkit.config"
import { agentActions, toolParameterSchemas } from "./agentkit"
import { getVectorStoreAttachment } from "./knowledgeBase"
import {
  createAgentSession,
  getAgentSession,
  updateAgentSession,
  type AgentSessionMessage,
} from "./sessions"

export type AgentSessionStartResult = {
  sessionId: string
  reply?: AgentSessionMessage | null
  memoryId?: string | null
  raw?: unknown
}

export type AgentSessionContinueResult = {
  sessionId: string
  reply?: AgentSessionMessage | null
  memoryId?: string | null
  raw?: unknown
}

let actionsSynced = false
let syncInFlight: Promise<void> | null = null

export function getAgentsClient(): any {
  return (client as any)?.agents ?? null
}

export async function ensureAgentActionsSynced(force = false) {
  if (actionsSynced && !force) return
  const agentsClient = getAgentsClient()
  if (!agentsClient?.actions?.sync) {
    actionsSynced = true
    return
  }
  if (syncInFlight && !force) {
    await syncInFlight
    return
  }
  const payload = agentActions.map(action => ({
    name: action.name,
    description: action.description,
    parameters: toolParameterSchemas[action.name as keyof typeof toolParameterSchemas] ?? { type: "object" },
    returns: { type: "object" },
  }))
  syncInFlight = agentsClient.actions
    .sync({
      workflow_id: agentKitRuntimeConfig.workflowId,
      actions: payload,
    })
    .then(() => {
      actionsSynced = true
    })
    .catch((error: unknown) => {
      actionsSynced = false
      console.warn("[agents] action sync failed", error)
    })
    .finally(() => {
      syncInFlight = null
    })
  await syncInFlight
}

export async function startAgentSession({
  projectId,
  messages,
}: {
  projectId: string
  messages: AgentSessionMessage[]
}): Promise<AgentSessionStartResult> {
  const session = await createAgentSession({ projectId, transcript: messages })
  const agentsClient = getAgentsClient()
  let reply: AgentSessionMessage | null = null
  let memoryId: string | null = null
  let raw: unknown
  try {
    await ensureAgentActionsSynced()
    const attachment = await getVectorStoreAttachment(projectId)
    if (agentsClient?.sessions?.create) {
      const response = await agentsClient.sessions.create({
        workflow_id: agentKitRuntimeConfig.workflowId,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        metadata: { projectId },
        attachments: attachment
          ? [
              {
                type: "file_search",
                vector_store_ids: [attachment.vectorStoreId],
              },
            ]
          : undefined,
      })
      raw = response
      memoryId = response?.memory_id ?? null
      reply = extractAssistantMessage(response)
    }
  } catch (error: unknown) {
    console.warn("[agents] start session failed", error)
  }

  if (!reply) {
    const fallback = await fallbackAssistant(messages)
    reply = fallback.reply
    raw = fallback.raw
  }

  const transcriptUpdates: AgentSessionMessage[] = []
  if (reply) transcriptUpdates.push(reply)
  await updateAgentSession(session.id, {
    memoryId: memoryId ?? undefined,
    appendTranscript: transcriptUpdates,
  })

  return { sessionId: session.id, reply, memoryId, raw }
}

export async function continueAgentSession({
  sessionId,
  messages,
}: {
  sessionId: string
  messages: AgentSessionMessage[]
}): Promise<AgentSessionContinueResult> {
  const session = await getAgentSession(sessionId)
  if (!session) {
    throw new Error(`Agent session ${sessionId} not found`)
  }

  const agentsClient = getAgentsClient()
  let reply: AgentSessionMessage | null = null
  let memoryId: string | null = session.memoryId ?? null
  let raw: unknown

  try {
    await ensureAgentActionsSynced()
    const attachment = await getVectorStoreAttachment(session.projectId)
    if (agentsClient?.sessions?.messages?.create) {
      const response = await agentsClient.sessions.messages.create({
        session_id: sessionId,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        attachments: attachment
          ? [
              {
                type: "file_search",
                vector_store_ids: [attachment.vectorStoreId],
              },
            ]
          : undefined,
      })
      raw = response
      memoryId = response?.memory_id ?? memoryId
      reply = extractAssistantMessage(response)
    }
  } catch (error: unknown) {
    console.warn("[agents] continue session failed", error)
  }

  if (!reply) {
    const fallback = await fallbackAssistant([
      ...session.transcript,
      ...messages,
    ])
    reply = fallback.reply
    raw = fallback.raw
  }

  const transcriptUpdates = [...messages]
  if (reply) transcriptUpdates.push(reply)

  const updated = await updateAgentSession(sessionId, {
    memoryId: memoryId ?? undefined,
    appendTranscript: transcriptUpdates,
  })

  return { sessionId: updated?.id ?? sessionId, reply, memoryId, raw }
}

async function fallbackAssistant(history: AgentSessionMessage[]) {
  const systemPrompt = [...history]
    .reverse()
    .find(message => message.role === "system")?.content
  const conversation = history.filter(message => message.role !== "system")
  const input = [] as any[]
  if (systemPrompt) {
    input.push({ role: "system", content: systemPrompt })
  }
  for (const message of conversation) {
    input.push({ role: message.role, content: message.content })
  }
  const response = await client.responses.create({
    model: agentKitRuntimeConfig.model,
    input,
  } as any)
  const text = extractText(response)
  return {
    reply: text
      ? {
          role: "assistant" as const,
          content: text,
          at: new Date().toISOString(),
        }
      : null,
    raw: response,
  }
}

function extractAssistantMessage(payload: any): AgentSessionMessage | null {
  const text = extractText(payload)
  if (!text) return null
  return {
    role: "assistant",
    content: text,
    at: new Date().toISOString(),
  }
}

export function extractText(payload: any): string | null {
  if (!payload) return null
  if (typeof payload === "string") return payload
  if (typeof payload.output === "string") return payload.output
  if (Array.isArray(payload.output)) {
    for (const item of payload.output) {
      const text = extractText(item)
      if (text) return text
    }
  }
  if (payload.output?.text && typeof payload.output.text === "string") {
    return payload.output.text
  }
  if (payload.output?.content && typeof payload.output.content === "string") {
    return payload.output.content
  }
  if (payload.output?.[0]?.content) {
    const maybe = payload.output[0].content
    if (typeof maybe === "string") return maybe
    if (Array.isArray(maybe)) {
      const textPart = maybe.find((part: any) => typeof part.text === "string")
      if (textPart?.text) return textPart.text
    }
  }
  if (payload.result && typeof payload.result === "string") return payload.result
  if (payload.result?.text && typeof payload.result.text === "string") return payload.result.text
  if (payload.final_output && typeof payload.final_output === "string") return payload.final_output
  if (typeof payload.message === "string") return payload.message
  if (payload.message?.content && typeof payload.message.content === "string") {
    return payload.message.content
  }
  if (payload.content && typeof payload.content === "string") return payload.content
  if (payload.text && typeof payload.text === "string") return payload.text
  if (payload.output_text && typeof payload.output_text === "string") {
    return payload.output_text
  }
  return null
}
