import { agentActions, agentkitWorkflowId } from "./agentkit"

const fallbackFastModel = process.env.OPENAI_MODEL || "gpt-4.1-mini"
const fastModel = process.env.OPENAI_MODEL_FAST || fallbackFastModel
const preciseModel = process.env.OPENAI_MODEL_PRECISE || fallbackFastModel

export const agentKitModels = {
  fast: fastModel,
  precise: preciseModel,
}

export type AgentKitRuntimeConfig = {
  workflowId: string
  model: string
  actions: typeof agentActions
}

export const agentKitRuntimeConfig: AgentKitRuntimeConfig = {
  workflowId: agentkitWorkflowId,
  model: fastModel,
  actions: agentActions,
}
