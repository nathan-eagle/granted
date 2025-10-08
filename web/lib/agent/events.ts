import { EventEmitter } from "events"

export type AgentEvent =
  | {
      type: "coverage.delta"
      payload: { projectId: string; score: number }
    }
  | {
      type: "conflict.found"
      payload: { projectId: string; key: string; previous?: Record<string, unknown>; next?: Record<string, unknown> }
    }
  | {
      type: "eligibility.flag"
      payload: { projectId: string; item: { id: string; text: string; fatal?: boolean } }
    }
  | {
      type: "draft.progress"
      payload: { projectId: string; sectionKey: string; status: "started" | "completed" }
    }
  | {
      type: "tighten.applied"
      payload: { projectId: string; sectionKey: string; status: "ok" | "overflow" }
    }

export const agentEventBus = new EventEmitter()

export function emitAgentEvent(event: AgentEvent) {
  agentEventBus.emit(event.type, event)
}

export function onAgentEvent<T extends AgentEvent["type"]>(type: T, listener: (event: Extract<AgentEvent, { type: T }>) => void) {
  agentEventBus.on(type, listener as any)
  return () => agentEventBus.off(type, listener as any)
}
