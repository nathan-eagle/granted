import { Prisma } from "@prisma/client"

import { prisma } from "../prisma"

export type MetricEvent = {
  event: string
  projectId?: string
  runId?: string | null
  action?: string
  status?: string
  durationMs?: number
  metadata?: Record<string, unknown>
}

export async function recordMetric(event: MetricEvent) {
  const payload = {
    ...event,
    timestamp: new Date().toISOString(),
  }
  console.log(JSON.stringify({ level: "metric", ...payload }))

  if (event.runId) {
    const prismaPayload = JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue
    await prisma.agentWorkflowRunEvent
      .create({
        data: {
          runId: event.runId,
          type: `metric.${event.event}`,
          payload: prismaPayload,
        },
      })
      .catch(() => undefined)
  }
}
