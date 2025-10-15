import { createHash } from "crypto";
import { z } from "zod";
import { getOpenAI } from "@/lib/openai";
import { getSupabaseAdmin, type DbRfpFactRow } from "@/lib/supabase";
import type { RfpFact, SourceAttachment } from "@/lib/types";
import { RFP_FACT_SLOTS, type FactParser } from "@/lib/rfp-fact-slots";

const INGEST_MODEL = process.env.GRANTED_INGEST_MODEL ?? process.env.GRANTED_MODEL ?? "gpt-4.1-mini";

const SYSTEM_PROMPT = [
  "You are a precise extractor of grant solicitation facts.",
  "Use file_search to quote verbatim instructions. Only emit information you can cite.",
  "Return JSON that matches the provided schema. Omit facts you cannot support.",
].join(" ");

const FACT_RESPONSE_SCHEMA = {
  name: "rfp_fact_response",
  schema: {
    type: "object",
    properties: {
      facts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            slot_id: { type: "string" },
            value_text: { type: "string" },
            value_json: { type: "object", additionalProperties: true, nullable: true },
            confidence: { type: "number" },
            evidence: {
              type: "object",
              properties: {
                file_id: { type: "string", nullable: true },
                page: { type: "integer", nullable: true },
                snippet: { type: "string", nullable: true },
                href: { type: "string", nullable: true },
                offsets: { type: "object", additionalProperties: true, nullable: true },
              },
              required: [],
              additionalProperties: false,
            },
          },
          required: ["slot_id", "value_text"],
          additionalProperties: false,
        },
      },
    },
    required: ["facts"],
    additionalProperties: false,
  },
} as const;

const FactListSchema = z.object({
  facts: z
    .array(
      z.object({
        slot_id: z.string(),
        value_text: z.string().min(1),
        value_json: z.record(z.any()).nullable().optional(),
        confidence: z.number().min(0).max(1).optional(),
        evidence: z
          .object({
            file_id: z.string().nullable().optional(),
            page: z.number().nullable().optional(),
            snippet: z.string().nullable().optional(),
            href: z.string().nullable().optional(),
            offsets: z.record(z.any()).nullable().optional(),
          })
          .nullable()
          .optional(),
      }),
    )
    .default([]),
});

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`).join(",")}}`;
}

export function hashCanonical(
  slotId: string,
  valueText: string,
  valueJson: Record<string, unknown> | null,
  evidenceKey: unknown,
): string {
  const canonical = {
    slotId,
    valueText: valueText.trim(),
    valueJson,
    evidence: evidenceKey,
  };
  return createHash("sha256").update(stableStringify(canonical)).digest("hex");
}

export function parseMoney(valueText: string): Record<string, unknown> | null {
  const match = valueText.match(/\$?\s*([\d,]+(?:\.\d+)?)(?:\s*(million|billion|thousand|k|m|bn|mm))?/i);
  if (!match) {
    return null;
  }
  let amount = parseFloat(match[1].replace(/,/g, ""));
  if (Number.isNaN(amount)) {
    return null;
  }
  const unit = match[2]?.toLowerCase();
  if (unit) {
    if (["million", "m", "mm"].includes(unit)) {
      amount *= 1_000_000;
    } else if (["billion", "bn"].includes(unit)) {
      amount *= 1_000_000_000;
    } else if (["thousand", "k"].includes(unit)) {
      amount *= 1_000;
    }
  }
  return { usd: Math.round(amount), raw: valueText.trim() };
}

export function parseDateTime(valueText: string): Record<string, unknown> | null {
  const parsed = Date.parse(valueText);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return {
    iso: new Date(parsed).toISOString(),
    raw: valueText.trim(),
  };
}

export function scoreConfidence(
  raw: number | undefined,
  evidenceProvided: boolean,
  parser: FactParser,
  valueJson: Record<string, unknown> | null,
): number {
  let score = raw ?? 0.65;
  if (!evidenceProvided) {
    score = Math.min(score, 0.72);
  } else {
    score = Math.max(score, 0.72);
  }
  if (parser === "datetime" && valueJson?.iso) {
    score = Math.max(score, 0.82);
  }
  if (parser === "money" && typeof valueJson?.usd === "number") {
    score = Math.max(score, 0.78);
  }
  if (score < 0.5) score = 0.5;
  if (score > 0.95) score = 0.95;
  return Number(score.toFixed(2));
}

function convertRow(row: DbRfpFactRow): RfpFact {
  return {
    id: row.id,
    sessionId: row.session_id,
    slotId: row.slot_id,
    valueText: row.value_text,
    valueJson: row.value_json ?? null,
    confidence: row.confidence,
    evidence: row.evidence_file_id || row.evidence_href || row.evidence_snippet
      ? {
          fileId: row.evidence_file_id ?? undefined,
          page: row.evidence_page ?? undefined,
          snippet: row.evidence_snippet ?? undefined,
          href: row.evidence_href ?? undefined,
          offsets: row.evidence_offsets ?? undefined,
        }
      : null,
    hash: row.hash,
    source: (row as { source?: string }).source ?? "ingested",
    annotations: (row as { annotations?: Record<string, unknown> | null }).annotations ?? null,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

interface NormalizedFactInsert {
  slotId: string;
  valueText: string;
  valueJson: Record<string, unknown> | null;
  confidence: number;
  evidence: {
    file_id?: string | null;
    page?: number | null;
    snippet?: string | null;
    href?: string | null;
    offsets?: Record<string, unknown> | null;
  } | null;
  hash: string;
  annotations?: Record<string, unknown> | null;
  source?: string;
}

export async function fetchFactsForSession(sessionId: string): Promise<RfpFact[]> {
  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase.from("rfp_facts").select("*").eq("session_id", sessionId);
  if (error) {
    throw error;
  }
  return (data ?? []).map(convertRow);
}

function buildUserPrompt(files: SourceAttachment[]): string {
  const fileLines = files.length
    ? [
        "Uploaded sources you can inspect:",
        ...files.map((source) => {
          const typeLabel = source.kind === "url" ? "URL" : "File";
          return `- [${typeLabel}] ${source.label}${source.href ? ` (${source.href})` : ""}`;
        }),
        "",
      ]
    : [];
  const taskLines = RFP_FACT_SLOTS.map(
    (slot, index) =>
      `${index + 1}. slot_id="${slot.slotId}" — ${slot.instruction}`,
  );
  return [
    ...fileLines,
    "For each requested slot below, search the files and return any verifiable facts.",
    "If a fact is absent, omit it.",
    "",
    ...taskLines,
  ].join("\n");
}

function normalizeRawFact(raw: z.infer<typeof FactListSchema>["facts"][number]): NormalizedFactInsert | null {
  const definition = RFP_FACT_SLOTS.find((slot) => slot.slotId === raw.slot_id);
  if (!definition) {
    return null;
  }
  const cleanedText = raw.value_text.trim();
  if (!cleanedText) {
    return null;
  }

  let valueJson: Record<string, unknown> | null = null;
  if (definition.parser === "datetime") {
    valueJson = parseDateTime(cleanedText) ?? (raw.value_json ?? null);
  } else if (definition.parser === "money") {
    valueJson = parseMoney(cleanedText) ?? (raw.value_json ?? null);
  } else {
    valueJson = raw.value_json ?? null;
  }

  const evidence = raw.evidence ?? null;
  const evidenceProvided =
    Boolean(evidence?.snippet && evidence.snippet.trim().length > 0) ||
    Boolean(evidence?.file_id) ||
    Boolean(evidence?.href);

  const confidence = scoreConfidence(raw.confidence, evidenceProvided, definition.parser, valueJson);

  const evidenceKey = evidenceProvided
    ? {
        file_id: evidence?.file_id ?? null,
        page: evidence?.page ?? null,
        snippet: evidence?.snippet ? evidence.snippet.slice(0, 240) : null,
        href: evidence?.href ?? null,
      }
    : null;

  const hash = hashCanonical(definition.slotId, cleanedText, valueJson, evidenceKey);

  return {
    slotId: definition.slotId,
    valueText: cleanedText,
    valueJson,
    confidence,
    evidence: evidenceProvided
      ? {
          file_id: evidence?.file_id ?? null,
          page: evidence?.page ?? null,
          snippet: evidence?.snippet ?? null,
          href: evidence?.href ?? null,
          offsets: evidence?.offsets ?? null,
        }
      : null,
    annotations: evidenceProvided ? (evidence as Record<string, unknown> | null) : null,
    source: "ingested",
    hash,
  };
}

async function insertNewFacts(sessionId: string, inserts: NormalizedFactInsert[]): Promise<RfpFact[]> {
  if (inserts.length === 0) {
    return [];
  }
  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase
    .from("rfp_facts")
    .insert(
      inserts.map((fact) => ({
        session_id: sessionId,
        slot_id: fact.slotId,
        value_text: fact.valueText,
        value_json: fact.valueJson,
        confidence: fact.confidence,
        evidence_file_id: fact.evidence?.file_id ?? null,
        evidence_page: fact.evidence?.page ?? null,
        evidence_snippet: fact.evidence?.snippet ?? null,
        evidence_href: fact.evidence?.href ?? null,
        evidence_offsets: fact.evidence?.offsets ?? null,
        hash: fact.hash,
        annotations: fact.annotations ?? null,
        source: fact.source ?? "ingested",
      })),
    )
    .select();
  if (error) {
    throw error;
  }
  const rows = data ?? [];
  if (rows.length > 0) {
    await supabase.from("rfp_facts_events").insert(
      rows.map((row) => ({
        fact_id: row.id,
        session_id: sessionId,
        kind: "ingested",
        payload: { hash: row.hash, slot_id: row.slot_id },
      })),
    );
  }
  return rows.map(convertRow);
}

export interface IngestFactsOptions {
  sessionId: string;
  vectorStoreId: string;
  sources: SourceAttachment[];
  existingHashes: Set<string>;
}

export interface IngestFactsResult {
  inserted: RfpFact[];
  skipped: number;
}

export async function ingestFactsForSession(options: IngestFactsOptions): Promise<IngestFactsResult> {
  const { sessionId, vectorStoreId, sources, existingHashes } = options;
  const client = getOpenAI();

  const rfpFileIds = sources
    .filter((source) => (source.meta?.kind ?? (source.kind === "file" ? "reference" : "reference")) === "rfp")
    .map((source) => source.id);

  const executeExtraction = async (fileIds: string[] | null) => {
    const requestPayload: Record<string, unknown> = {
      model: INGEST_MODEL,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: SYSTEM_PROMPT,
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: buildUserPrompt(sources),
            },
          ],
        },
      ],
      tools: [
        {
          type: "file_search",
          vector_store_ids: [vectorStoreId],
          file_ids: fileIds ?? undefined,
        },
      ],
      max_output_tokens: 800,
      response_format: {
        type: "json_schema",
        json_schema: FACT_RESPONSE_SCHEMA,
      },
    };

    const response = await client.responses.create(
      requestPayload as unknown as Parameters<typeof client.responses.create>[0],
    );

    const rawText = ((response as { output_text?: string }).output_text ?? "").trim();
    if (!rawText) {
      return { inserted: [] as RfpFact[], skipped: 0 };
    }

    let parsed: z.infer<typeof FactListSchema>;
    try {
      parsed = FactListSchema.parse(JSON.parse(rawText));
    } catch (error) {
      console.warn("[normalize.ingest] Failed to parse fact payload", error);
      return { inserted: [] as RfpFact[], skipped: 0 };
    }

    const normalized = parsed.facts
      .map(normalizeRawFact)
      .filter((fact): fact is NormalizedFactInsert => Boolean(fact));

    const seenHashes = new Set(existingHashes);
    const deduped: NormalizedFactInsert[] = [];
    let skipped = 0;
    for (const fact of normalized) {
      if (seenHashes.has(fact.hash)) {
        skipped += 1;
        continue;
      }
      seenHashes.add(fact.hash);
      deduped.push(fact);
    }

    const inserted = await insertNewFacts(sessionId, deduped);
    return { inserted, skipped };
  };

  let totalSkipped = 0;
  if (rfpFileIds.length > 0) {
    const primary = await executeExtraction(rfpFileIds);
    totalSkipped += primary.skipped;
    if (primary.inserted.length > 0) {
      return primary;
    }
  }

  const fallback = await executeExtraction(null);
  return {
    inserted: fallback.inserted,
    skipped: totalSkipped + fallback.skipped,
  };
}

export function groupFactsBySlot(facts: RfpFact[]): Map<string, RfpFact[]> {
  const map = new Map<string, RfpFact[]>();
  for (const fact of facts) {
    if (!map.has(fact.slotId)) {
      map.set(fact.slotId, []);
    }
    map.get(fact.slotId)!.push(fact);
  }
  for (const value of map.values()) {
    value.sort((a, b) => b.confidence - a.confidence);
  }
  return map;
}
