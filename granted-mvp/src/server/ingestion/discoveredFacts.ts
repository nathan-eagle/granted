import { z } from "zod";
import { getOpenAI } from "@/lib/openai";
import type { RfpFact } from "@/lib/types";
import {
  hashCanonical,
  insertFacts,
  NormalizedFactInsert,
  parseDateTime,
  parseMoney,
  scoreConfidence,
} from "@/server/ingestion/rfpFacts";
import type { DiscoveredDoD, DiscoveredSlot, SatisfactionPolicy } from "@/lib/discovered-dod";

type FactParser = "datetime" | "money" | "text";

const EvidenceSchema = z.object({
  quote: z.string().optional(),
  sourceId: z.string().optional(),
  page: z.number().optional(),
  href: z.string().optional(),
});

const SlotAnswerSchema = z.object({
  value: z.string().optional().nullable(),
  enumValue: z.string().optional().nullable(),
  notes: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  evidence: z.array(EvidenceSchema).optional(),
  verified: z.boolean().optional(),
});

const SLOT_RESPONSE_JSON_SCHEMA = {
  name: "discovered_slot_response",
  schema: {
    type: "object",
    properties: {
      value: { type: ["string", "null"] },
      enumValue: { type: ["string", "null"] },
      confidence: { type: "number" },
      notes: { type: "string" },
      verified: { type: "boolean" },
      evidence: {
        type: "array",
        items: {
          type: "object",
          properties: {
            quote: { type: "string" },
            sourceId: { type: "string" },
            page: { type: "integer" },
            href: { type: "string" },
          },
          additionalProperties: false,
        },
      },
    },
    additionalProperties: false,
  },
} as const;

function extractJsonFromResponse(response: unknown): unknown | null {
  if (!response || typeof response !== "object") {
    return null;
  }
  const candidate = response as Record<string, unknown>;
  const output = candidate.output;
  if (Array.isArray(output)) {
    for (const item of output) {
      const content = (item as { content?: unknown }).content;
      if (Array.isArray(content)) {
        for (const part of content) {
          if (part && typeof part === "object") {
            const typed = part as { type?: string; json?: unknown; text?: string };
            if (typed.type === "output_json" && typed.json) {
              return typed.json;
            }
            if (typed.type === "output_text" && typeof typed.text === "string") {
              try {
                return JSON.parse(typed.text);
              } catch {
                // continue
              }
            }
          }
        }
      }
    }
  }
  const outputText = candidate.output_text;
  if (typeof outputText === "string" && outputText.trim().length > 0) {
    try {
      return JSON.parse(outputText);
    } catch {
      return null;
    }
  }
  return null;
}

function buildSlotPrompt(slot: DiscoveredSlot): string {
  const lines = [
    `Slot: ${slot.label}`,
    `Requiredness: ${slot.requiredness}`,
    `Value type: ${slot.type}`,
  ];
  if (slot.condition) {
    lines.push(`Condition: ${slot.condition}`);
  }
  if (slot.constraints && Object.keys(slot.constraints).length > 0) {
    lines.push(`Constraints: ${JSON.stringify(slot.constraints)}`);
  }
  if (slot.type === "enum" && slot.enum && slot.enum.length > 0) {
    lines.push(`Allowed options: ${slot.enum.join(", ")}`);
  }
  lines.push(
    "",
    "Return a JSON object with the requested value, confidence (0-1), and 1-3 evidence quotes with sourceId/page.",
    "If you cannot find a supported answer, return null value and an empty evidence array.",
  );
  return lines.join("\n");
}

function satisfactionPolicyRequiresEvidence(policy: SatisfactionPolicy): boolean {
  return policy === "requires_evidence";
}

function parserForSlot(slotType: DiscoveredSlot["type"]): FactParser {
  if (slotType === "date") return "datetime";
  if (slotType === "money") return "money";
  return "text";
}

function buildValueJson(slot: DiscoveredSlot, valueText: string, verified: boolean, raw?: Partial<z.infer<typeof SlotAnswerSchema>>): Record<string, unknown> {
  const base: Record<string, unknown> = {
    type: slot.type,
    verified,
  };
  if (slot.type === "enum" && raw?.enumValue) {
    base.enumValue = raw.enumValue;
  }
  if (slot.constraints && Object.keys(slot.constraints).length > 0) {
    base.constraints = slot.constraints;
  }
  if (slot.condition) {
    base.condition = slot.condition;
  }
  if (raw?.notes) {
    base.notes = raw.notes;
  }
  base.value = valueText;
  return base;
}

function normalizeSlotFact({
  slot,
  parsed,
  policy,
}: {
  slot: DiscoveredSlot;
  parsed: z.infer<typeof SlotAnswerSchema>;
  policy: SatisfactionPolicy;
}): NormalizedFactInsert | null {
  const valueText = (parsed.value ?? parsed.enumValue ?? "").trim();
  if (!valueText) {
    return null;
  }

  const evidence = parsed.evidence?.filter((item) => !!item) ?? [];
  const evidenceProvided = evidence.length > 0 && Boolean(evidence[0]?.quote || evidence[0]?.sourceId || evidence[0]?.href);
  if (satisfactionPolicyRequiresEvidence(policy) && !evidenceProvided) {
    return null;
  }

  let valueJson: Record<string, unknown> | null = null;
  if (slot.type === "date") {
    valueJson = parseDateTime(valueText) ?? null;
  } else if (slot.type === "money") {
    valueJson = parseMoney(valueText) ?? null;
  }
  const parser = parserForSlot(slot.type);

  const verified = parsed.verified ?? (policy === "requires_evidence" ? evidenceProvided : false);

  const enrichedValueJson = {
    ...(valueJson ?? {}),
    ...buildValueJson(slot, valueText, verified, parsed),
  };

  const confidence = scoreConfidence(parsed.confidence, evidenceProvided, parser, enrichedValueJson);

  const primaryEvidence = evidenceProvided ? evidence[0] : null;
  const evidencePayload = evidenceProvided
    ? {
        file_id: primaryEvidence?.sourceId ?? null,
        page: primaryEvidence?.page ?? null,
        snippet: primaryEvidence?.quote ? primaryEvidence.quote.slice(0, 240) : null,
        href: primaryEvidence?.href ?? null,
        offsets: null,
      }
    : null;

  const hash = hashCanonical(slot.slotId, valueText, enrichedValueJson, evidencePayload);

  return {
    slotId: slot.slotId,
    valueText,
    valueJson: enrichedValueJson,
    confidence,
    evidence: evidencePayload,
    annotations: {
      satisfactionPolicy: policy,
      verified,
      rawEvidence: evidence,
    },
    source: "ingested",
    hash,
  };
}

async function extractSlotFact({
  sessionId,
  slot,
  vectorStoreId,
  modelId,
}: {
  sessionId: string;
  slot: DiscoveredSlot;
  vectorStoreId: string;
  modelId: string;
}): Promise<NormalizedFactInsert | null> {
  const client = getOpenAI();
  try {
    const response = await client.responses.create({
      model: modelId,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: "Answer using only the provided RFP context. Cite sources with page numbers. Return JSON that matches the schema.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: buildSlotPrompt(slot),
            },
          ],
        },
      ],
      tools: [
        {
          type: "file_search",
          vector_store_ids: [vectorStoreId],
        },
      ],
      tool_choice: "required",
      response_format: {
        type: "json_schema",
        json_schema: SLOT_RESPONSE_JSON_SCHEMA,
      },
      max_output_tokens: 800,
      metadata: {
        session_id: sessionId,
        purpose: `extract_slot:${slot.slotId}`,
      },
    } as unknown as Parameters<typeof client.responses.create>[0]);

    const jsonPayload = extractJsonFromResponse(response);
    if (!jsonPayload) {
      return null;
    }
    const parsed = SlotAnswerSchema.safeParse(jsonPayload);
    if (!parsed.success) {
      return null;
    }
    return normalizeSlotFact({ slot, parsed: parsed.data, policy: slot.satisfactionPolicy });
  } catch (error) {
    console.warn("[extractSlotFact] failed", { slotId: slot.slotId, sessionId, error });
    return null;
  }
}

export interface ExtractFactsOptions {
  sessionId: string;
  dod: DiscoveredDoD;
  vectorStoreId: string;
  modelId: string;
  existingHashes: Set<string>;
  dryRun?: boolean;
}

export interface ExtractFactsResult {
  inserted: RfpFact[];
  attempts: number;
  skipped: number;
  candidates: NormalizedFactInsert[];
}

export async function extractFactsFromDiscoveredDoD(options: ExtractFactsOptions): Promise<ExtractFactsResult> {
  const { sessionId, dod, vectorStoreId, modelId, existingHashes, dryRun } = options;
  const inserts: NormalizedFactInsert[] = [];
  let attempts = 0;
  let skipped = 0;

  for (const section of dod.sections) {
    for (const slot of section.slots) {
      if (slot.requiredness === "must" || slot.requiredness === "should") {
        attempts += 1;
        const normalized = await extractSlotFact({ sessionId, slot, vectorStoreId, modelId });
        if (!normalized) {
          skipped += 1;
          continue;
        }
        if (existingHashes.has(normalized.hash)) {
          skipped += 1;
          continue;
        }
        existingHashes.add(normalized.hash);
        inserts.push(normalized);
      }
    }
  }

  if (inserts.length === 0) {
    return { inserted: [], attempts, skipped, candidates: [] };
  }

  if (dryRun) {
    return { inserted: [], attempts, skipped, candidates: inserts };
  }

  const inserted = await insertFacts(sessionId, inserts);
  return { inserted, attempts, skipped, candidates: inserts };
}
