import { createHash } from "crypto";
import { z } from "zod";
import { getOpenAI } from "@/lib/openai";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { SourceAttachment } from "@/lib/types";
import type {
  DiscoveredDoD,
  DiscoveredEvidenceAnchor,
  DiscoveredSection,
  DiscoveredSlot,
  SatisfactionPolicy,
  SourceFingerprint,
} from "@/lib/discovered-dod";

export interface DoDRecord {
  sessionId: string;
  version: number;
  dod: DiscoveredDoD;
  sourcesSignature: string;
  vectorStoreId: string;
  files: SourceFingerprint[];
  modelId: string;
  createdJobId?: string | null;
  createdAt: string;
  updatedAt: string;
}

const AnchorSchema = z.object({
  sourceId: z.string().optional(),
  page: z.number().optional(),
  heading: z.string().optional(),
  quote: z.string().optional(),
  href: z.string().optional(),
});

const RawSlotSchema = z.object({
  slotId: z.string().optional(),
  label: z.string(),
  requiredness: z.enum(["must", "should", "conditional"]),
  type: z.enum(["text", "date", "money", "enum", "file", "email", "url"]).default("text"),
  enum: z.array(z.string()).optional(),
  constraints: z.record(z.any()).optional(),
  condition: z.string().nullable().optional(),
  evidence: z.array(AnchorSchema).optional(),
  satisfactionPolicy: z.enum(["requires_evidence", "user_affirmation_ok", "either"]).optional(),
  aliases: z.array(z.string()).optional(),
});

const RawSectionSchema = z.object({
  id: z.string().optional(),
  label: z.string(),
  order: z.number().optional(),
  evidence: z.array(AnchorSchema).optional(),
  slots: z.array(RawSlotSchema).default([]),
});

const RawDoDSchema = z.object({
  version: z.union([z.number(), z.string()]).default(1),
  sections: z.array(RawSectionSchema).default([]),
});

const DISCOVERY_JSON_SCHEMA = {
  name: "discovered_dod_response",
  schema: {
    type: "object",
    properties: {
      version: { type: ["integer", "string"] },
      sections: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            label: { type: "string" },
            order: { type: "integer" },
            evidence: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  sourceId: { type: "string" },
                  page: { type: "integer" },
                  heading: { type: "string" },
                  quote: { type: "string" },
                  href: { type: "string" },
                },
                additionalProperties: false,
              },
            },
            slots: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  slotId: { type: "string" },
                  label: { type: "string" },
                  requiredness: { enum: ["must", "should", "conditional"] },
                  satisfactionPolicy: {
                    enum: ["requires_evidence", "user_affirmation_ok", "either"],
                  },
                  type: {
                    enum: ["text", "date", "money", "enum", "file", "email", "url"],
                  },
                  enum: { type: "array", items: { type: "string" } },
                  constraints: { type: "object" },
                  condition: { type: ["string", "null"] },
                  evidence: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        sourceId: { type: "string" },
                        page: { type: "integer" },
                        heading: { type: "string" },
                        quote: { type: "string" },
                        href: { type: "string" },
                      },
                      additionalProperties: false,
                    },
                  },
                },
                required: ["label", "requiredness"],
                additionalProperties: false,
              },
            },
          },
          required: ["label", "slots"],
          additionalProperties: false,
        },
      },
    },
    required: ["sections"],
    additionalProperties: false,
  },
} as const;

const SYSTEM_PROMPT = [
  "You are a precise requirements analyst.",
  "Extract only the application structure and checklist that the provided RFP requires.",
  "Return JSON that validates against the supplied schema. If a field is not present, omit it.",
  "Prefer exact wording from the RFP for labels. Include evidence anchors (sourceId/page/quote) whenever possible.",
  "Do not invent requirements that are not explicitly in the materials.",
].join(" ");

function slug(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function shortHash(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 6);
}

export function makeDiscoveredSlotId(
  sectionId: string,
  label: string,
  anchors: DiscoveredEvidenceAnchor[],
): string {
  const base = `${slug(sectionId)}.${slug(label)}`;
  const anchorSig = shortHash(
    anchors
      .map((anchor) => `${anchor.page ?? ""}|${anchor.heading ?? ""}|${(anchor.quote ?? "").slice(0, 80)}`)
      .join("||"),
  );
  return `${base}-${anchorSig}`.slice(0, 120);
}

export function computeSourcesSignature(sources: SourceAttachment[]): {
  signature: string;
  files: SourceFingerprint[];
} {
  const files: SourceFingerprint[] = sources
    .filter((source) => source.kind === "file")
    .map((source) => {
      const meta = source.meta ?? {};
      return {
        id: source.id,
        name: source.label,
        bytes: typeof meta.bytes === "number" ? meta.bytes : null,
        etag: typeof meta.etag === "string" ? meta.etag : null,
        pageCount: typeof meta.pageCount === "number" ? meta.pageCount : null,
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  const signature = createHash("sha256")
    .update(JSON.stringify(files))
    .digest("hex");

  return { signature, files };
}

function inferSatisfactionPolicy(sectionLabel: string, slotLabel: string, slotType: string): SatisfactionPolicy {
  const text = `${sectionLabel} ${slotLabel}`.toLowerCase();
  const requiresEvidenceKeywords = [
    "deadline",
    "submission",
    "format",
    "eligibility",
    "registration",
    "sam",
    "uei",
    "portal",
    "email",
    "rubric",
    "evaluation",
    "score",
    "budget",
    "cost share",
    "match",
    "attachment",
    "appendix",
    "compliance",
    "limit",
  ];
  const userAffirmationKeywords = [
    "narrative",
    "project",
    "outcome",
    "goal",
    "impact",
    "team",
    "personnel",
    "capacity",
    "experience",
    "history",
    "organization",
    "budget narrative",
    "prior work",
    "track record",
  ];

  if (requiresEvidenceKeywords.some((keyword) => text.includes(keyword))) {
    return "requires_evidence";
  }
  if (userAffirmationKeywords.some((keyword) => text.includes(keyword))) {
    return "user_affirmation_ok";
  }
  if (slotType === "date" || slotType === "money" || slotType === "enum" || slotType === "file" || slotType === "url" || slotType === "email") {
    return "requires_evidence";
  }
  return "either";
}

function normalizeDiscoveredDoD(raw: z.infer<typeof RawDoDSchema>): DiscoveredDoD {
  const sections: DiscoveredSection[] = [];
  raw.sections.forEach((rawSection, index) => {
    const sectionId = rawSection.id ?? slug(rawSection.label || `section-${index + 1}`);
    const evidence = rawSection.evidence?.map((anchor) => ({ ...anchor })) ?? [];
    const slots: DiscoveredSlot[] = rawSection.slots.map((slot) => {
      const anchors = slot.evidence?.map((anchor) => ({ ...anchor })) ?? [];
      const canonicalId = makeDiscoveredSlotId(sectionId, slot.label, anchors);
      const policy =
        slot.satisfactionPolicy ??
        inferSatisfactionPolicy(rawSection.label, slot.label, slot.type ?? "text");
      const aliases =
        slot.slotId && slot.slotId !== canonicalId ? Array.from(new Set([slot.slotId, ...(slot.aliases ?? [])])) : slot.aliases ?? [];
      return {
        slotId: canonicalId,
        label: slot.label,
        requiredness: slot.requiredness,
        type: slot.type ?? "text",
        enum: slot.enum,
        constraints: slot.constraints,
        condition: slot.condition ?? null,
        evidence: anchors,
        satisfactionPolicy: policy,
        aliases: aliases && aliases.length > 0 ? aliases : undefined,
      };
    });
    sections.push({
      id: sectionId,
      label: rawSection.label,
      order: rawSection.order,
      evidence,
      slots,
    });
  });
  return {
    version: typeof raw.version === "string" ? Number.parseInt(raw.version, 10) || 1 : raw.version ?? 1,
    sections,
  };
}

function buildDiscoveryPrompt(sources: SourceAttachment[]): string {
  const files = sources
    .filter((source) => source.kind === "file")
    .map((source) => `- ${source.label}`);
  return [
    "Using the RFP materials accessible via file_search, extract the required sections and checklist of deliverables.",
    "Return the Definition of Done JSON. Prefer concise labels taken directly from headings.",
    "",
    files.length ? "Files available:\n" + files.join("\n") : "",
  ]
    .filter(Boolean)
    .join("\n");
}

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

export async function loadDiscoveredDoD(sessionId: string): Promise<DoDRecord | null> {
  const supabase = await getSupabaseAdmin();
  try {
    const { data, error } = await supabase
      .from("rfp_discovered_dod")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (error) {
      if (typeof error.code === "string" && error.code === "42P01") {
        console.warn("[discoverDoD] table missing when loading – falling back", { sessionId });
        return null;
      }
      throw error;
    }

    if (!data) {
      return null;
    }

    const parsed = RawDoDSchema.safeParse(data.dod ?? {});
    if (!parsed.success) {
      return null;
    }
    const normalized = normalizeDiscoveredDoD(parsed.data);
    normalized.version = typeof data.version === "number" ? data.version : normalized.version;

    return {
      sessionId,
      version: normalized.version,
      dod: normalized,
      sourcesSignature: data.sources_signature as string,
      vectorStoreId: data.vector_store_id as string,
      files: (data.files_json as SourceFingerprint[]) ?? [],
      modelId: data.model_id as string,
      createdJobId: data.created_job_id ?? null,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    console.error("[discoverDoD] failed to load", { sessionId, error });
    return null;
  }
}

export async function saveDiscoveredDoD(options: {
  sessionId: string;
  dod: DiscoveredDoD;
  signature: string;
  vectorStoreId: string;
  files: SourceFingerprint[];
  modelId: string;
  jobId?: string | null;
  previous?: DoDRecord | null;
}): Promise<void> {
  const { sessionId, dod, signature, vectorStoreId, files, modelId, jobId, previous } = options;
  const supabase = await getSupabaseAdmin();

  if (previous) {
    const { error: historyError } = await supabase.from("rfp_discovered_dod_history").insert({
      session_id: previous.sessionId,
      version: previous.version,
      dod: previous.dod,
      sources_signature: previous.sourcesSignature,
      vector_store_id: previous.vectorStoreId,
      files_json: previous.files,
      model_id: previous.modelId,
      created_job_id: previous.createdJobId ?? null,
    });
    if (historyError && historyError.code !== "42P01") {
      throw historyError;
    }
    if (historyError && historyError.code === "42P01") {
      console.warn("[discoverDoD] history table missing when saving", { sessionId });
    }
  }

  const { error: upsertError } = await supabase.from("rfp_discovered_dod").upsert({
    session_id: sessionId,
    version: dod.version,
    dod,
    sources_signature: signature,
    vector_store_id: vectorStoreId,
    files_json: files,
    model_id: modelId,
    created_job_id: jobId ?? null,
    updated_at: new Date().toISOString(),
  });
  if (upsertError && upsertError.code !== "42P01") {
    throw upsertError;
  }
  if (upsertError && upsertError.code === "42P01") {
    console.warn("[discoverDoD] table missing on save; skipping persistence", { sessionId });
  }
}

export async function discoverDoD({
  sessionId,
  vectorStoreId,
  sources,
  modelId,
}: {
  sessionId: string;
  vectorStoreId: string;
  sources: SourceAttachment[];
  modelId: string;
}): Promise<DiscoveredDoD | null> {
  const client = getOpenAI();
  try {
    const response = await client.responses.create({
      model: modelId,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: SYSTEM_PROMPT }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: buildDiscoveryPrompt(sources) }],
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
        json_schema: DISCOVERY_JSON_SCHEMA,
      },
      max_output_tokens: 1500,
      metadata: {
        session_id: sessionId,
        purpose: "discover_dod",
      },
    } as unknown as Parameters<typeof client.responses.create>[0]);

    const rawJson = extractJsonFromResponse(response);
    if (!rawJson) {
      return null;
    }
    const parsed = RawDoDSchema.safeParse(rawJson);
    if (!parsed.success) {
      return null;
    }
    return normalizeDiscoveredDoD(parsed.data);
  } catch (error) {
    console.warn("[discoverDoD] Failed to discover definition of done", {
      sessionId,
      error,
    });
    return null;
  }
}
