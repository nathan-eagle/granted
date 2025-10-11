import { CoverageSnapshot, CoverageSlot } from "./types";

export interface CoverageComputationInput {
  sections: CoverageSlot[];
}

export function computeCoverageScore(slots: CoverageSlot[]): number {
  if (!slots.length) return 0;
  const points = slots.reduce((acc, slot) => {
    if (slot.status === "complete") return acc + 1;
    if (slot.status === "partial") return acc + 0.5;
    return acc;
  }, 0);
  return Math.min(1, points / slots.length);
}

export function createCoverageSnapshot(slots: CoverageSlot[], summary?: string): CoverageSnapshot {
  return {
    score: computeCoverageScore(slots),
    summary: summary ?? "Tracking active RFP sections.",
    slots,
    updatedAt: Date.now(),
  };
}
