import type { DiscoveredDoD, DiscoveredSlot, SatisfactionPolicy } from "@/lib/discovered-dod";
import type { CoverageQuestion, CoverageSlot, CoverageSlotFact, RfpFact } from "@/lib/types";

interface SlotEvaluation {
  slot: DiscoveredSlot;
  facts: CoverageSlotFact[];
  status: CoverageSlot["status"];
  satisfied: boolean;
  nA: boolean;
  needsCitation: boolean;
}

const ANSWER_KIND_MAP: Record<DiscoveredSlot["type"], "text" | "date" | "url"> = {
  text: "text",
  date: "date",
  money: "text",
  enum: "text",
  file: "url",
  email: "url",
  url: "url",
};

function determineVerified(fact: RfpFact): boolean {
  const annotations = fact.annotations;
  if (annotations && typeof annotations === "object" && annotations !== null && "verified" in annotations) {
    const candidate = (annotations as { verified?: boolean }).verified;
    if (typeof candidate === "boolean") {
      return candidate;
    }
  }

  const valueJson = fact.valueJson;
  if (valueJson && typeof valueJson === "object" && valueJson !== null && "verified" in valueJson) {
    const candidate = (valueJson as { verified?: boolean }).verified;
    if (typeof candidate === "boolean") {
      return candidate;
    }
  }

  return Boolean(
    fact.evidence &&
      ((fact.evidence.snippet && fact.evidence.snippet.trim().length > 0) ||
        fact.evidence.href ||
        fact.evidence.page !== null),
  );
}

function isMarkedNA(fact: RfpFact): boolean {
  const valueJson = fact.valueJson;
  if (valueJson && typeof valueJson === "object" && valueJson !== null && "na" in valueJson) {
    return Boolean((valueJson as { na?: boolean }).na);
  }
  return fact.valueText.toLowerCase().includes("n/a");
}

function toCoverageFacts(facts: RfpFact[]): CoverageSlotFact[] {
  return facts.slice(0, 2).map((fact) => ({
    slotId: fact.slotId,
    valueText: fact.valueText,
    confidence: fact.confidence,
    evidence: fact.evidence ?? undefined,
    verified: determineVerified(fact),
  }));
}

function evaluateSlot(slot: DiscoveredSlot, facts: RfpFact[]): SlotEvaluation {
  const nAFact = facts.find((fact) => isMarkedNA(fact));
  if (nAFact) {
    return {
      slot,
      facts: toCoverageFacts([nAFact]),
      status: "complete",
      satisfied: true,
      nA: true,
      needsCitation: false,
    };
  }

  const orderedFacts = facts.filter((fact) => !isMarkedNA(fact));
  const coverageFacts = toCoverageFacts(orderedFacts);
  const hasFacts = orderedFacts.length > 0;
  const hasVerified = coverageFacts.some((fact) => fact.verified);
  const topFactConfidence = orderedFacts[0]?.confidence ?? 0;

  let status: CoverageSlot["status"] = "missing";
  let satisfied = false;
  let needsCitation = false;

  const policy: SatisfactionPolicy = slot.satisfactionPolicy;

  if (hasFacts) {
    if (policy === "requires_evidence") {
      if (hasVerified) {
        status = "complete";
        satisfied = true;
      } else {
        status = topFactConfidence >= 0.5 ? "partial" : "missing";
        needsCitation = true;
      }
    } else if (policy === "either") {
      status = hasVerified ? "complete" : "complete";
      satisfied = true;
      if (!hasVerified) {
        needsCitation = true;
      }
    } else {
      status = "complete";
      satisfied = true;
    }
  }

  if (!hasFacts && policy === "requires_evidence") {
    needsCitation = true;
  }

  return {
    slot,
    facts: coverageFacts,
    status,
    satisfied,
    nA: false,
    needsCitation,
  };
}

function slotAnswerKind(slot: DiscoveredSlot): "text" | "date" | "url" {
  return ANSWER_KIND_MAP[slot.type] ?? "text";
}

export interface CreateCoverageFromDoDOptions {
  dod: DiscoveredDoD;
  factsBySlot: Map<string, RfpFact[]>;
  draftStatuses?: Map<string, string>;
  previousSlots?: Map<string, CoverageSlot>;
}

export interface CreateCoverageFromDoDResult {
  slots: CoverageSlot[];
  weightedScore: number;
  mustActive: number;
  mustSatisfied: number;
  shouldTotal: number;
  shouldSatisfied: number;
}

export function createCoverageFromDiscoveredDoD(options: CreateCoverageFromDoDOptions): CreateCoverageFromDoDResult {
  const { dod, factsBySlot, draftStatuses } = options;

  const sectionSlots: CoverageSlot[] = [];
  let mustActive = 0;
  let mustSatisfied = 0;
  let shouldTotal = 0;
  let shouldSatisfied = 0;

  for (const section of dod.sections) {
    const evaluations = section.slots.map((slot) => {
      const slotFacts = factsBySlot.get(slot.slotId) ?? [];
      return evaluateSlot(slot, slotFacts);
    });

    const facts: CoverageSlotFact[] = [];
    const items = evaluations.map((evaluation) => {
      facts.push(...evaluation.facts);
      return {
        id: evaluation.slot.slotId,
        label: evaluation.slot.label,
        factIds: [evaluation.slot.slotId],
        satisfied: evaluation.satisfied,
        notApplicable: evaluation.nA || undefined,
        requiredness: evaluation.slot.requiredness,
        satisfactionPolicy: evaluation.slot.satisfactionPolicy,
        condition: evaluation.slot.condition ?? null,
      };
    });

    const missingFactSlotIds: string[] = [];
    const questions: CoverageQuestion[] = [];

    evaluations.forEach((evaluation) => {
      const isMust = evaluation.slot.requiredness === "must" || evaluation.slot.requiredness === "conditional";
      const isShould = evaluation.slot.requiredness === "should";

      if (isMust) {
        if (!evaluation.nA) {
          mustActive += 1;
          if (evaluation.satisfied) {
            mustSatisfied += 1;
          }
        }
      }
      if (isShould) {
        shouldTotal += 1;
        if (evaluation.satisfied) {
          shouldSatisfied += 1;
        }
      }

      if (!evaluation.satisfied || evaluation.needsCitation) {
        missingFactSlotIds.push(evaluation.slot.slotId);
        const prompt = evaluation.needsCitation
          ? `Add a cited answer for ${evaluation.slot.label}.`
          : `Provide ${evaluation.slot.label}.`;
        questions.push({
          id: `${section.id}-${evaluation.slot.slotId}`,
          sectionId: section.id,
          prompt,
          factIds: [evaluation.slot.slotId],
          answerKind: slotAnswerKind(evaluation.slot),
        });
      }
    });

    let status: CoverageSlot["status"] = "missing";
    const mustEvaluations = evaluations.filter(
      (evaluation) => evaluation.slot.requiredness === "must" || evaluation.slot.requiredness === "conditional",
    );
    const mustSatisfiedCount = mustEvaluations.filter((evaluation) => evaluation.satisfied || evaluation.nA).length;
    const mustActiveCount = mustEvaluations.filter((evaluation) => !evaluation.nA).length;
    const hasPartialMust = mustEvaluations.some((evaluation) => evaluation.status === "partial");
    const hasAnySatisfied = evaluations.some((evaluation) => evaluation.satisfied);

    if (mustActiveCount > 0 && mustSatisfiedCount === mustActiveCount && !hasPartialMust) {
      status = "complete";
    } else if (hasAnySatisfied || evaluations.some((evaluation) => evaluation.status === "partial")) {
      status = "partial";
    } else {
      status = "missing";
    }

    if (draftStatuses) {
      const draftStatus = draftStatuses.get(section.id);
      if (draftStatus === "complete") {
        status = "complete";
      } else if (draftStatus === "partial" && status === "missing") {
        status = "partial";
      }
    }

    const coverageSlot: CoverageSlot = {
      id: section.id,
      label: section.label,
      status,
      notes: undefined,
      facts: facts.length ? facts : undefined,
      missingFactSlotIds: missingFactSlotIds.length ? Array.from(new Set(missingFactSlotIds)) : undefined,
      items,
      questions: questions.slice(0, 3),
    };

    sectionSlots.push(coverageSlot);
  }

  const denom = mustActive + shouldTotal * 0.5;
  const weightedScore = denom > 0 ? Math.min(1, (mustSatisfied + shouldSatisfied * 0.5) / denom) : 0;

  return {
    slots: sectionSlots,
    weightedScore,
    mustActive,
    mustSatisfied,
    shouldTotal,
    shouldSatisfied,
  };
}
