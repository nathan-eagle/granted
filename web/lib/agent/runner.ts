import { Agent, run } from "@openai/agents"

import { prisma } from "../prisma"
import { agentKitRuntimeConfig } from "./agentkit.config"
import {
  agentKitTools,
  executeAgentAction,
  type AgentActionInput,
  type AgentActionOutput,
  type AgentActionName,
} from "./agentkit"

export type AgentToolInvocation<Action extends AgentActionName> = {
  action: Action
  input: AgentActionInput<Action>
}

async function invokeAgentTool<Action extends AgentActionName>({ action, input }: AgentToolInvocation<Action>) {
  const entry = agentKitTools[action]
  const agent = new Agent({
    name: `Granted Tool Runner: ${action}`,
    instructions: `You are a deterministic tool runner. The user will provide JSON arguments under “args”.
Call the tool ${entry.definition.name} exactly once with those arguments. Do not modify the arguments.
Return the tool output verbatim and do not add narration.`,
    tools: [entry.tool],
    toolUseBehavior: "stop_on_first_tool",
    model: agentKitRuntimeConfig.model,
    modelSettings: { toolChoice: entry.definition.name },
  })

  const payload = JSON.stringify({ args: input })
  const result = await run(agent, payload, {
    maxTurns: 2,
    context: { args: input },
  })

  const output = result.finalOutput
  if (output === undefined) {
    throw new Error(`Agent tool ${action} returned no output`)
  }
  return agentKitTools[action].definition.output.parse(output) as AgentActionOutput<Action>
}

export async function orchestrateWithAgents(actions: AgentToolInvocation<AgentActionName>[]) {
  const outputs: { action: AgentActionName; result: unknown }[] = []
  for (const step of actions) {
    const output = await invokeAgentTool(step)
    outputs.push({ action: step.action, result: output })
  }
  return outputs
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

  try {
    const [result] = await orchestrateWithAgents([{ action, input }])
    resultPayload = result.result as AgentActionOutput<Action>
    await prisma.agentWorkflowRunEvent.create({
      data: {
        runId: runRecord.id,
        type: "tool.result",
        payload: { action, input, result: resultPayload },
      },
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
      result: { action, result: resultPayload, fallbackUsed },
      completedAt: new Date(),
    },
  })

  return resultPayload
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
