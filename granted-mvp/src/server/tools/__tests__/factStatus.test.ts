import { describe, it, expect } from "vitest";
import { evaluateFactStatus } from "@/server/tools/factStatus";
import type { RfpFact } from "@/lib/types";

function buildFact(slotId: string, confidence: number, valueText = "value"): RfpFact {
  return {
    id: `${slotId}-${confidence}`,
    sessionId: "session-1",
    slotId,
    valueText,
    valueJson: null,
    confidence,
    evidence: null,
    hash: `${slotId}-${confidence}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

describe("evaluateFactStatus", () => {
  it("promotes to complete when enough high-confidence facts exist", () => {
    const factsBySlot = new Map<string, RfpFact[]>([
      ["rfp.title", [buildFact("rfp.title", 0.9, "Solicitation Title")]],
      ["rfp.deadline", [buildFact("rfp.deadline", 0.83, "2025-01-31")]],
    ]);
    const result = evaluateFactStatus(["rfp.title", "rfp.deadline", "rfp.portal"], 1, 2, factsBySlot);
    expect(result.status).toBe("complete");
    expect(result.missingSlots).toContain("rfp.portal");
    expect(result.facts).toHaveLength(2);
  });

  it("returns partial when only medium confidence data exists", () => {
    const factsBySlot = new Map<string, RfpFact[]>([["rfp.portal", [buildFact("rfp.portal", 0.68, "grants.gov")]]]);
    const result = evaluateFactStatus(["rfp.portal"], 1, 1, factsBySlot);
    expect(result.status).toBe("partial");
    expect(result.missingSlots).toHaveLength(0);
  });

  it("keeps missing when no facts are supplied", () => {
    const result = evaluateFactStatus(["eligibility.summary"], 1, 1, new Map());
    expect(result.status).toBe("missing");
    expect(result.facts).toHaveLength(0);
    expect(result.missingSlots).toEqual(["eligibility.summary"]);
  });
});
