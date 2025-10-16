import { tool } from "@openai/agents";
import { z } from "zod";
import { createCoverageSnapshot, COVERAGE_TEMPLATES } from "@/lib/coverage";
import type { GrantAgentContext } from "@/lib/agent-context";
import { getSupabaseAdmin } from "@/lib/supabase";
import type {
  CoverageQuestion,
  CoverageSnapshot,
  CoverageSlot,
  CoverageSlotFact,
  RfpFact,
  SourceAttachment,
} from "@/lib/types";
import { saveCoverageSnapshot } from "@/lib/session-store";
import { isFactsIngestionEnabled } from "@/lib/feature-flags";
import { fetchFactsForSession, groupFactsBySlot, ingestFactsForSession } from "@/server/ingestion/rfpFacts";
import { computeSourcesSignature, discoverDoD, loadDiscoveredDoD, saveDiscoveredDoD } from "@/server/discovery/discoveredDoD";
import { extractFactsFromDiscoveredDoD } from "@/server/ingestion/discoveredFacts";
import { createCoverageFromDiscoveredDoD } from "@/server/coverage/discoveredCoverage";
import type { DiscoveredDoD } from "@/lib/discovered-dod";
import { SECTION_DEFINITIONS } from "@/lib/dod";

const DISCOVERY_MODEL = process.env.GRANTED_DISCOVER_MODEL ?? process.env.GRANTED_MODEL ?? "gpt-4.1-mini";
const INGEST_MODEL = process.env.GRANTED_INGEST_MODEL ?? process.env.GRANTED_MODEL ?? "gpt-4.1-mini";

function toSourceAttachment(row: {
  id: string;
  openai_file_id: string | null;
  label: string;
  kind: string;
  href: string | null;
  metadata: Record<string, unknown> | null;
}): SourceAttachment {
  return {
    id: row.openai_file_id ?? row.id,
    label: row.label,
    kind: row.kind === "url" ? "url" : "file",
    href: row.href ?? undefined,
    meta: (row.metadata as Record<string, string | number> | null) ?? undefined,
  };
}

async function fetchSessionContext(sessionId: string): Promise<{
  sources: SourceAttachment[];
  draftStatuses: Map<string, string>;
}> {
  const supabase = await getSupabaseAdmin();
  const [sourcesResult, draftsResult] = await Promise.all([
    supabase
      .from("sources")
      .select("id, openai_file_id, label, kind, href, metadata")
      .eq("session_id", sessionId),
    supabase
      .from("section_drafts")
      .select("section_id, status, markdown")
      .eq("session_id", sessionId),
  ]);

  if (sourcesResult.error) {
    console.warn("normalizeRfp: failed to load sources", sourcesResult.error);
  }
  if (draftsResult.error) {
    console.warn("normalizeRfp: failed to load drafts", draftsResult.error);
  }

  const sources = (sourcesResult.data ?? []).map(toSourceAttachment);

  const draftStatuses = new Map<string, string>(
    (draftsResult.data ?? []).map((row) => {
      const statusColumn = typeof row.status === "string" ? row.status : null;
      if (statusColumn === "missing" || statusColumn === "partial" || statusColumn === "complete") {
        return [row.section_id as string, statusColumn];
      }
      const text = (row.markdown as string | null) ?? "";
      const trimmed = text.trim();
      const fallback = trimmed.length === 0 ? "missing" : trimmed.length > 400 ? "complete" : "partial";
      return [row.section_id as string, fallback];
    }),
  );

  return { sources, draftStatuses };
}

function summarizeCoverage(slots: CoverageSlot[]): string {
  if (!slots.length) {
    return "Tracking active RFP sections.";
  }
  const total = slots.length;
  const complete = slots.filter((slot) => slot.status === "complete").length;
  const partial = slots.filter((slot) => slot.status === "partial").length;
  const missing = total - complete - partial;
  const nextTarget = slots.find((slot) => slot.status === "missing") ?? slots.find((slot) => slot.status === "partial");
  const scorePercent = total > 0 ? Math.round(((complete + partial * 0.5) / total) * 100) : 0;
  const segments = [
    `Coverage ${scorePercent}% (${complete}/${total} complete, ${partial} partial, ${missing} missing).`,
    nextTarget ? `Next focus: ${nextTarget.label}.` : "All sections mapped. Ready to export.",
  ];
  return segments.join(" ");
}

export interface NormalizeRfpResult {
  coverage: CoverageSnapshot;
  promotions: Array<{
    slotId: string;
    from: CoverageSlot["status"] | null;
    to: CoverageSlot["status"];
    viaFacts: boolean;
  }>;
  dodVersion?: number | null;
  discoveryToast?: { fromVersion?: number | null; toVersion: number } | null;
}

const HIGH_CONFIDENCE = 0.8;
const MEDIUM_CONFIDENCE = 0.6;

function isHighConfidenceFact(fact: RfpFact): boolean {
  return (fact.source === "user" && fact.confidence >= 0.5) || fact.confidence >= HIGH_CONFIDENCE;
}

function isMediumConfidenceFact(fact: RfpFact): boolean {
  return (fact.source === "user" && fact.confidence >= 0.5) || fact.confidence >= MEDIUM_CONFIDENCE;
}

function selectFacts(factIds: string[], factsBySlot: Map<string, RfpFact[]>, limitPerSlot = 2): CoverageSlotFact[] {
  const picks: CoverageSlotFact[] = [];
  factIds.forEach((slotId) => {
    const slotFacts = factsBySlot.get(slotId) ?? [];
    slotFacts.slice(0, limitPerSlot).forEach((fact) => {
      picks.push({
        slotId,
        valueText: fact.valueText,
        confidence: fact.confidence,
        evidence: fact.evidence ?? undefined,
        verified: Boolean(fact.evidence),
      });
    });
  });
  return picks;
}

function mergeFactsUnique(facts: CoverageSlotFact[]): CoverageSlotFact[] {
  const seen = new Map<string, CoverageSlotFact>();
  for (const fact of facts) {
    const key = `${fact.slotId}:${fact.valueText}`;
    if (!seen.has(key)) {
      seen.set(key, fact);
    }
  }
  return Array.from(seen.values());
}

function buildTemplateCoverage({
  factsBySlot,
  previousSlots,
  draftStatuses,
}: {
  factsBySlot: Map<string, RfpFact[]>;
  previousSlots: Map<string, CoverageSlot>;
  draftStatuses: Map<string, string>;
}): { slots: CoverageSlot[]; promotions: NormalizeRfpResult["promotions"] } {
  const promotions: NormalizeRfpResult["promotions"] = [];

  const slots: CoverageSlot[] = COVERAGE_TEMPLATES.map((template) => {
    const definition = SECTION_DEFINITIONS.find((section) => section.id === template.id);
    const items = definition?.items ?? [];
    const fallbackFactIds = template.factSlotIds ?? [];

    const itemStatuses = items.map((item) => {
      const slotFacts = item.factIds.flatMap((slotId) => factsBySlot.get(slotId) ?? []);
      const satisfied = slotFacts.some(isHighConfidenceFact);
      return {
        id: item.id,
        label: item.label,
        factIds: item.factIds,
        satisfied,
        hasSignal: slotFacts.some(isMediumConfidenceFact),
      };
    });

    const satisfiedCount = itemStatuses.filter((item) => item.satisfied).length;
    const hasSignal = itemStatuses.some((item) => item.hasSignal);

    let status: CoverageSlot["status"];
    if (!items.length) {
      status = previousSlots.get(template.id)?.status ?? "missing";
    } else if (satisfiedCount === items.length) {
      status = "complete";
    } else if (satisfiedCount > 0 || hasSignal) {
      status = "partial";
    } else {
      status = "missing";
    }

    const draftStatus = draftStatuses.get(template.id);
    if (draftStatus === "complete") {
      status = "complete";
    } else if (draftStatus === "partial" && status === "missing") {
      status = "partial";
    }

    const pendingQuestions: CoverageQuestion[] = itemStatuses
      .filter((item) => !item.satisfied)
      .map((item) => {
        const definitionItem = items.find((candidate) => candidate.id === item.id);
        return {
          id: `${template.id}-${item.id}`,
          sectionId: template.id,
          prompt: definitionItem?.question ?? `Provide details for ${item.label}.`,
          factIds: definitionItem?.factIds ?? [],
          answerKind: definitionItem?.answerKind ?? "text",
        };
      });

    const factIdsForSlot = items.length > 0 ? items.flatMap((item) => item.factIds) : fallbackFactIds;
    const slotFacts = mergeFactsUnique(factIdsForSlot.length ? selectFacts(factIdsForSlot, factsBySlot) : []);
    const missingFactSlotIds = pendingQuestions.length
      ? pendingQuestions.flatMap((question) => (question.factIds.length ? question.factIds : fallbackFactIds))
      : fallbackFactIds;

    const previousStatus = previousSlots.get(template.id)?.status ?? null;
    if (previousStatus !== status) {
      promotions.push({
        slotId: template.id,
        from: previousStatus,
        to: status,
        viaFacts: satisfiedCount > 0 || hasSignal,
      });
    }

    return {
      id: template.id,
      label: template.label,
      status,
      notes: template.notes,
      facts: slotFacts.length ? slotFacts : undefined,
      missingFactSlotIds: missingFactSlotIds.length ? missingFactSlotIds : undefined,
      items: itemStatuses.map((item) => ({
        id: item.id,
        label: item.label,
        factIds: item.factIds,
        satisfied: item.satisfied,
      })),
      questions: pendingQuestions.slice(0, 3),
    } satisfies CoverageSlot;
  }).sort((a, b) => {
    const priority = new Map(COVERAGE_TEMPLATES.map((item, index) => [item.id, item.priority ?? index]));
    return (priority.get(a.id) ?? 99) - (priority.get(b.id) ?? 99);
  });

  return { slots, promotions };
}

function computePromotions(previousSlots: Map<string, CoverageSlot>, currentSlots: CoverageSlot[]): NormalizeRfpResult["promotions"] {
  const promotions: NormalizeRfpResult["promotions"] = [];
  for (const slot of currentSlots) {
    const previous = previousSlots.get(slot.id);
    const previousStatus = previous?.status ?? null;
    if (previousStatus !== slot.status) {
      promotions.push({
        slotId: slot.id,
        from: previousStatus,
        to: slot.status,
        viaFacts: Boolean(slot.facts && slot.facts.length > 0),
      });
    }
  }
  return promotions;
}

async function ensureDiscoveredDoD({
  sessionId,
  sources,
  vectorStoreId,
  existing,
}: {
  sessionId: string;
  sources: SourceAttachment[];
  vectorStoreId?: string | null;
  existing: Awaited<ReturnType<typeof loadDiscoveredDoD>> | null;
}): Promise<{
  dod: DiscoveredDoD | null;
  version: number | null;
  toast: { fromVersion?: number | null; toVersion: number } | null;
}> {
  const { signature, files } = computeSourcesSignature(sources);

  if (!vectorStoreId || files.length === 0) {
    return {
      dod: existing?.dod ?? null,
      version: existing?.version ?? null,
      toast: null,
    };
  }

  if (existing && existing.sourcesSignature === signature) {
    return {
      dod: existing.dod,
      version: existing.version,
      toast: null,
    };
  }

  const discovered = await discoverDoD({
    sessionId,
    vectorStoreId,
    sources,
    modelId: DISCOVERY_MODEL,
  });

  if (!discovered) {
    return {
      dod: existing?.dod ?? null,
      version: existing?.version ?? null,
      toast: null,
    };
  }

  const version = existing ? existing.version + 1 : 1;
  const normalized: DiscoveredDoD = {
    ...discovered,
    version,
  };

  await saveDiscoveredDoD({
    sessionId,
    dod: normalized,
    signature,
    vectorStoreId,
    files,
    modelId: DISCOVERY_MODEL,
    previous: existing,
  });

  console.info("[normalize.discover] updated DoD", {
    sessionId,
    version,
    sections: normalized.sections.length,
    slots: normalized.sections.reduce((acc, section) => acc + section.slots.length, 0),
  });

  return {
    dod: normalized,
    version,
    toast: existing ? { fromVersion: existing.version, toVersion: version } : null,
  };
}

export async function normalizeRfp(context: GrantAgentContext): Promise<NormalizeRfpResult> {
  const { sources, draftStatuses } = await fetchSessionContext(context.sessionId);
  const previousSlots = new Map(context.coverage?.slots?.map((slot) => [slot.id, slot]) ?? []);
  context.sources = sources;

  let facts: RfpFact[] = [];
  const existingHashes = new Set<string>();
  try {
    facts = await fetchFactsForSession(context.sessionId);
    for (const fact of facts) {
      existingHashes.add(fact.hash);
    }
  } catch (error) {
    console.warn("[normalize.ingest] failed to load existing facts", {
      sessionId: context.sessionId,
      error,
    });
  }

  const factIngestionEnabled = isFactsIngestionEnabled();
  const fileSources = sources.filter((source) => source.kind === "file");

  const existingDoDRecord = await loadDiscoveredDoD(context.sessionId);
  const discoveryResult = await ensureDiscoveredDoD({
    sessionId: context.sessionId,
    sources,
    vectorStoreId: context.vectorStoreId,
    existing: existingDoDRecord,
  });

  let discoveredDoD = discoveryResult.dod;
  let dodVersion = discoveryResult.version;
  const discoveryToast = discoveryResult.toast;

  if (!discoveredDoD && existingDoDRecord) {
    discoveredDoD = existingDoDRecord.dod;
    dodVersion = existingDoDRecord.version;
  }

  const shouldRunLegacyIngestion = (!discoveredDoD || discoveredDoD.sections.length === 0) && factIngestionEnabled;

  if (shouldRunLegacyIngestion && fileSources.length > 0 && context.vectorStoreId) {
    try {
      const ingestResult = await ingestFactsForSession({
        sessionId: context.sessionId,
        vectorStoreId: context.vectorStoreId,
        sources: fileSources,
        existingHashes,
      });
      if (ingestResult.inserted.length > 0) {
        for (const fact of ingestResult.inserted) {
          facts.push(fact);
          existingHashes.add(fact.hash);
        }
        console.info("[metric] normalize.ingest.inserted", {
          sessionId: context.sessionId,
          count: ingestResult.inserted.length,
        });
      }
      if (ingestResult.skipped > 0) {
        console.info("[metric] normalize.ingest.skipped", {
          sessionId: context.sessionId,
          count: ingestResult.skipped,
        });
      }
    } catch (error) {
      console.warn("[normalize.ingest] failed to ingest facts", {
        sessionId: context.sessionId,
        error,
      });
    }
  }

  const shouldRunDiscoveredExtraction =
    factIngestionEnabled && discoveredDoD && discoveredDoD.sections.length > 0 && context.vectorStoreId;

  if (shouldRunDiscoveredExtraction) {
    try {
      const result = await extractFactsFromDiscoveredDoD({
        sessionId: context.sessionId,
        dod: discoveredDoD!,
        vectorStoreId: context.vectorStoreId!,
        modelId: INGEST_MODEL,
        existingHashes,
      });
      console.info("[metric] normalize.discovered.summary", {
        sessionId: context.sessionId,
        attempts: result.attempts,
        skipped: result.skipped,
        candidates: result.candidates.length,
        inserted: result.inserted.length,
      });
      if (result.inserted.length > 0) {
        for (const fact of result.inserted) {
          facts.push(fact);
          existingHashes.add(fact.hash);
        }
        console.info("[metric] normalize.discovered.inserted", {
          sessionId: context.sessionId,
          count: result.inserted.length,
        });
      }
    } catch (error) {
      console.warn("[normalize.discovered] extraction failed", {
        sessionId: context.sessionId,
        error,
      });
    }
  }

  const factsBySlot = groupFactsBySlot(facts);

  let coverage: CoverageSnapshot;
  let promotions: NormalizeRfpResult["promotions"] = [];

  if (discoveredDoD && discoveredDoD.sections.length > 0) {
    const coverageComputation = createCoverageFromDiscoveredDoD({
      dod: discoveredDoD,
      factsBySlot,
      draftStatuses,
    });
    const summary = summarizeCoverage(coverageComputation.slots);
    coverage = createCoverageSnapshot(coverageComputation.slots, summary, dodVersion ?? discoveredDoD.version);
    coverage.score = coverageComputation.weightedScore;
    coverage.dodVersion = dodVersion ?? discoveredDoD.version;
    promotions = computePromotions(previousSlots, coverage.slots);
    context.discoveredDoD = discoveredDoD;
    context.dodVersion = coverage.dodVersion ?? null;
    context.discoveryToast = discoveryToast ?? undefined;
  } else {
    const fallback = buildTemplateCoverage({
      factsBySlot,
      previousSlots,
      draftStatuses,
    });
    const summary = summarizeCoverage(fallback.slots);
    coverage = createCoverageSnapshot(fallback.slots, summary);
    promotions = fallback.promotions;
    context.discoveredDoD = null;
    context.dodVersion = null;
    context.discoveryToast = undefined;
  }

  context.coverage = coverage;
  await saveCoverageSnapshot(context.sessionId, coverage, coverage.dodVersion ?? null);

  console.info("[metric] coverage.percent", {
    sessionId: context.sessionId,
    value: coverage.score,
    dodVersion: coverage.dodVersion ?? null,
  });

  return {
    coverage,
    promotions,
    dodVersion: coverage.dodVersion ?? null,
    discoveryToast: discoveryToast ?? null,
  };
}

export const normalizeRfpTool = tool({
  name: "normalize_rfp",
  description: "Create or update the normalized RFP structure for this session.",
  parameters: z.object({ sessionId: z.string() }),
  strict: true,
  async execute(_input, runContext) {
    const context = runContext?.context as GrantAgentContext | undefined;
    if (!context) {
      throw new Error("Missing grant agent context");
    }
    const result = await normalizeRfp(context);
    return JSON.stringify(result);
  },
});
