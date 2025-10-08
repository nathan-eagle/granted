import { agentActions, agentkitWorkflowId } from "./agentkit"

export type AgentKitRuntimeConfig = {
  workflowId: string
  model: string
  actions: typeof agentActions
}

export const agentKitRuntimeConfig: AgentKitRuntimeConfig = {
  workflowId: agentkitWorkflowId,
  model: process.env.AGENTKIT_MODEL ?? "gpt-4.1-mini",
  actions: agentActions,
}
