import type { AgentActionInput, AgentActionName, AgentActionOutput } from "@/lib/agent/agentkit"
import { callAgentActionWithAgents } from "@/lib/agent/runner"
import { onAgentEvent } from "@/lib/agent/events"

export const agentkit = {
  actions: {
    invoke: async <Name extends AgentActionName>(
      name: Name,
      input: AgentActionInput<Name>
    ): Promise<AgentActionOutput<Name>> => callAgentActionWithAgents(name, input),
  },
  events: {
    subscribe: onAgentEvent,
  },
}

export type AgentKitEventType = Parameters<typeof onAgentEvent>[0]
export type AgentKitUnsubscribe = ReturnType<typeof onAgentEvent>
