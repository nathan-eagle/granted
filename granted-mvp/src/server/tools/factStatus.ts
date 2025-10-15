import type { CoverageSlot, CoverageSlotFact, RfpFact } from "@/lib/types";

export interface FactStatusResult {
  status: CoverageSlot["status"];
  facts: CoverageSlotFact[];
  missingSlots: string[];
}

export function evaluateFactStatus(
  slotIds: string[],
  partialThreshold: number | undefined,
  completeThreshold: number | undefined,
  factsBySlot: Map<string, RfpFact[]>,
): FactStatusResult {
  if (slotIds.length === 0) {
    return { status: "missing", facts: [], missingSlots: [] };
  }

  const facts: CoverageSlotFact[] = slotIds.flatMap((slotId) => {
    const [best] = factsBySlot.get(slotId) ?? [];
    if (!best) {
      return [];
    }
    return [
      {
        slotId,
        valueText: best.valueText,
        confidence: best.confidence,
        evidence: best.evidence ?? undefined,
      } satisfies CoverageSlotFact,
    ];
  });

  if (facts.length === 0) {
    return { status: "missing", facts: [], missingSlots: slotIds };
  }

  const highConfidenceCount = facts.filter((fact) => fact.confidence >= 0.8).length;
  const mediumConfidenceCount = facts.filter((fact) => fact.confidence >= 0.6 && fact.confidence < 0.8).length;
  const requiredPartial = partialThreshold ?? Math.min(1, slotIds.length);
  const requiredComplete = completeThreshold ?? slotIds.length;
  const missingSlots = slotIds.filter((slotId) => !facts.some((fact) => fact.slotId === slotId));

  if (requiredComplete > 0 && highConfidenceCount >= requiredComplete) {
    return { status: "complete", facts, missingSlots };
  }

  if (requiredPartial > 0 && highConfidenceCount + mediumConfidenceCount >= requiredPartial) {
    return { status: "partial", facts, missingSlots };
  }

  return { status: "missing", facts, missingSlots: slotIds };
}
