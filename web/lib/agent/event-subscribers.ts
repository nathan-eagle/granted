import { onAgentEvent } from "./events"
import { upsertConflictLog } from "./conflicts"
import { upsertEligibilityItem } from "./eligibility"

onAgentEvent("conflict.found", async event => {
  try {
    await upsertConflictLog({
      projectId: event.payload.projectId,
      key: event.payload.key,
      previous: event.payload.previous ?? null,
      next: event.payload.next ?? null,
      metadata: {
        source: "agent-event",
      },
    })
  } catch (error) {
    console.warn("Failed to persist conflict event", { error })
  }
})

onAgentEvent("eligibility.flag", async event => {
  try {
    await upsertEligibilityItem(event.payload.projectId, {
      id: event.payload.item.id,
      text: event.payload.item.text,
      fatal: event.payload.item.fatal ?? true,
      confidence:
        typeof (event.payload.item as any)?.confidence === "number"
          ? (event.payload.item as any).confidence
          : undefined,
      provenance: (event.payload.item as any)?.provenance as Record<string, unknown> | undefined,
    })
  } catch (error) {
    console.warn("Failed to persist eligibility event", { error })
  }
})
