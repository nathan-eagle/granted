import { Agent, run } from "@openai/agents"
import { z } from "zod"

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
  const outputs: unknown[] = []
  for (const step of actions) {
    try {
      const output = await invokeAgentTool(step)
      outputs.push(output)
    } catch (error) {
      // fallback: execute directly to keep determinism
      const direct = await executeAgentAction(step.action, step.input)
      outputs.push(direct)
    }
  }
  return outputs
}

export async function callAgentActionWithAgents<Action extends AgentActionName>(action: Action, input: AgentActionInput<Action>) {
  const [result] = await orchestrateWithAgents([{ action, input }])
  return result as AgentActionOutput<Action>
}
