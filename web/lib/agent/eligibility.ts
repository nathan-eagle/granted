import { Prisma } from "@prisma/client"

import { prisma } from "../prisma"
import { persistAgentState } from "./state"

export type EligibilityItem = {
  id: string
  text: string
  fatal?: boolean
  confidence?: number
  provenance?: Record<string, unknown>
  overrides?: {
    fatal?: boolean
    note?: string
    at: string
  }
}

export type EligibilityState = {
  items: EligibilityItem[]
}

function normalizeEligibility(value: unknown): EligibilityState {
  if (!value || typeof value !== "object") return { items: [] }
  const items = Array.isArray((value as any).items)
    ? ((value as any).items as EligibilityItem[])
    : Array.isArray(value)
    ? (value as EligibilityItem[])
    : []
  return {
    items: items
      .filter(item => item && typeof item === "object" && typeof (item as any).id === "string")
      .map(item => ({
        id: item.id,
        text: item.text ?? "",
        fatal: item.fatal ?? true,
        confidence: item.confidence,
        provenance: item.provenance,
        overrides: item.overrides,
      })),
  }
}

async function saveEligibility(projectId: string, state: EligibilityState) {
  await prisma.project.update({
    where: { id: projectId },
    data: { eligibilityJson: state as Prisma.InputJsonValue },
  })
  await persistAgentState({ projectId, eligibility: state as unknown as Record<string, unknown> })
  return state
}

export async function upsertEligibilityItem(projectId: string, item: EligibilityItem) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { eligibilityJson: true },
  })
  const state = normalizeEligibility(project?.eligibilityJson ?? { items: [] })
  const existingIndex = state.items.findIndex(entry => entry.id === item.id)
  const nextItem: EligibilityItem = {
    ...item,
    fatal: item.fatal ?? true,
  }
  if (existingIndex >= 0) {
    state.items.splice(existingIndex, 1, {
      ...state.items[existingIndex],
      ...nextItem,
    })
  } else {
    state.items.push(nextItem)
  }
  await saveEligibility(projectId, state)
  return state.items
}

export async function overrideEligibilityItem(
  projectId: string,
  eligibilityId: string,
  updates: { fatal: boolean; note?: string }
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { eligibilityJson: true },
  })
  const state = normalizeEligibility(project?.eligibilityJson ?? { items: [] })
  const target = state.items.find(entry => entry.id === eligibilityId)
  if (!target) {
    throw new Error(`Eligibility item ${eligibilityId} not found`)
  }
  target.fatal = updates.fatal
  target.overrides = {
    fatal: updates.fatal,
    note: updates.note,
    at: new Date().toISOString(),
  }
  await saveEligibility(projectId, state)
  return state.items
}

export async function listEligibilityItems(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { eligibilityJson: true },
  })
  return normalizeEligibility(project?.eligibilityJson).items
}
