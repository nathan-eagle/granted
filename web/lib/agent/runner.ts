import { prisma } from "../prisma"
import { recordMetric } from "../observability/metrics"
import {
  agentKitTools,
  executeAgentAction,
  type AgentActionInput,
  type AgentActionName,
  type AgentActionOutput,
} from "./agentkit"
import { agentKitRuntimeConfig } from "./agentkit.config"
import { ensureAgentActionsSynced, getAgentsClient } from "./runtime"
import { getVectorStoreAttachment } from "./knowledgeBase"

export type AgentToolInvocation<Action extends AgentActionName> = {
  action: Action
  input: AgentActionInput<Action>
}

type InvokeResult<Action extends AgentActionName> = {
  output: AgentActionOutput<Action>
  durationMs: number
  hadAttachment: boolean
  agentsRunId?: string | null
}

function extractProjectId<Action extends AgentActionName>(input: AgentActionInput<Action>): string | null {
  if (input && typeof input === "object" && "projectId" in input) {
    const value = (input as Record<string, unknown>)["projectId"]
    if (typeof value === "string" && value.trim().length) {
      return value
    }
  }
  return null
}

function extractRunPayload(payload: any): any {
  if (!payload) return payload
  if (payload.output !== undefined) {
    if (typeof payload.output === "string") return payload.output
    if (Array.isArray(payload.output)) {
      const found = payload.output.find((part: any) => part?.type === "json" || typeof part?.value !== "undefined")
      if (found?.value !== undefined) return found.value
    }
    if (payload.output?.value !== undefined) return payload.output.value
    if (payload.output?.json !== undefined) return payload.output.json
    if (payload.output?.data !== undefined) return payload.output.data
    if (payload.output?.content !== undefined) return payload.output.content
  }
  if (payload.result !== undefined) return payload.result
  if (payload.final_output !== undefined) return payload.final_output
  if (payload.data !== undefined) return payload.data
  return payload
}

async function invokeAgentTool<Action extends AgentActionName>({ action, input }: AgentToolInvocation<Action>): Promise<InvokeResult<Action>> {
  const agentsClient = getAgentsClient()
  if (!agentsClient?.runs?.create) {
    throw new Error("Agents SDK runs.create is not available")
  }

  await ensureAgentActionsSynced()

  const entry = agentKitTools[action]
  const projectId = extractProjectId(input)
  const vectorAttachment = projectId ? await getVectorStoreAttachment(projectId) : null
  const startedAt = Date.now()

  const response = await agentsClient.runs.create({
    workflow_id: agentKitRuntimeConfig.workflowId,
    action: {
      name: entry.definition.name,
      arguments: input,
    },
    attachments:
      vectorAttachment
        ? [
            {
              type: "file_search",
              vector_store_ids: [vectorAttachment.vectorStoreId],
            },
          ]
        : undefined,
    metadata: {
      projectId,
      action,
    },
  })

  const parsed = entry.definition.output.parse(extractRunPayload(response)) as AgentActionOutput<Action>
  return {
    output: parsed,
    durationMs: Date.now() - startedAt,
    hadAttachment: Boolean(vectorAttachment),
    agentsRunId: response?.id ?? null,
  }
}

export async function callAgentActionWithAgents<Action extends AgentActionName>(action: Action, input: AgentActionInput<Action>) {
  const projectId = extractProjectId(input)
  const runRecord = await prisma.agentWorkflowRun.create({
    data: {
      workflowId: agentKitRuntimeConfig.workflowId,
      projectId,
      status: "running",
      input: { action, input },
      startedAt: new Date(),
    },
  })

  let fallbackUsed = false
  let resultPayload: AgentActionOutput<Action>
  let agentsRunId: string | null = null

  try {
    const { output, durationMs, hadAttachment, agentsRunId: externalId } = await invokeAgentTool({ action, input })
    resultPayload = output
    agentsRunId = externalId ?? null
    await prisma.agentWorkflowRunEvent.create({
      data: {
        runId: runRecord.id,
        type: "tool.result",
        payload: { action, input, result: resultPayload, agentsRunId },
      },
    })
    await recordMetric({
      event: "agent.tool.run",
      runId: runRecord.id,
      action,
      projectId: projectId ?? undefined,
      status: "completed",
      durationMs,
      metadata: { hasAttachment: hadAttachment, agentsRunId },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    await prisma.agentWorkflowRunEvent.create({
      data: {
        runId: runRecord.id,
        type: "tool.error",
        payload: { action, input, error: errorMessage },
      },
    })
    await recordMetric({
      event: "agent.tool.run",
      runId: runRecord.id,
      action,
      projectId: projectId ?? undefined,
      status: "failed",
      metadata: { error: errorMessage },
    })

    try {
      resultPayload = await executeAgentAction(action, input)
      fallbackUsed = true
      await prisma.agentWorkflowRunEvent.create({
        data: {
          runId: runRecord.id,
          type: "tool.fallback",
          payload: { action, input, result: resultPayload },
        },
      })
    } catch (fallbackError) {
      const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
      await prisma.agentWorkflowRun.update({
        where: { id: runRecord.id },
        data: {
          status: "failed",
          error: fallbackMessage,
          completedAt: new Date(),
        },
      })
      throw fallbackError
    }
  }

  const finalStatus = fallbackUsed ? "succeeded_fallback" : "succeeded"
  await prisma.agentWorkflowRun.update({
    where: { id: runRecord.id },
    data: {
      status: finalStatus,
      result: { action, result: resultPayload, fallbackUsed, agentsRunId },
      completedAt: new Date(),
    },
  })
  await recordMetric({
    event: "agent.tool.complete",
    runId: runRecord.id,
    action,
    projectId: projectId ?? undefined,
    status: finalStatus,
    metadata: agentsRunId ? { agentsRunId } : undefined,
  })

  return resultPayload
}
