import { tool } from "@openai/agents";
import { z } from "zod";
import type { GrantAgentContext } from "@/lib/agent-context";
import type { CoverageSlotFact, ProvenanceSnapshot } from "@/lib/types";
import { getOpenAI } from "@/lib/openai";
import { RFP_FACT_SLOTS } from "@/lib/rfp-fact-slots";

export interface DraftSectionInput {
  sectionId: string;
  prompt: string;
  wordTarget?: number | null;
  vectorStoreId?: string | null;
  facts?: CoverageSlotFact[] | null;
}

export interface DraftSectionResult {
  markdown: string;
}

const DRAFT_MODEL = process.env.GRANTED_DRAFT_MODEL ?? process.env.GRANTED_MODEL ?? "gpt-4.1";

const FACT_LABELS = new Map(RFP_FACT_SLOTS.map((definition) => [definition.slotId, definition.summary]));

function truncateSnippet(snippet?: string | null): string | null {
  if (!snippet) return null;
  const trimmed = snippet.trim().replace(/\s+/g, " ");
  if (trimmed.length <= 200) {
    return trimmed;
  }
  return `${trimmed.slice(0, 197)}…`;
}

function summarizeFacts(facts?: CoverageSlotFact[] | null): string | null {
  if (!facts || facts.length === 0) {
    return null;
  }
  const lines = facts.map((fact) => {
    const label = FACT_LABELS.get(fact.slotId) ?? fact.slotId;
    const citationParts: string[] = [];
    if (fact.evidence?.page !== undefined && fact.evidence?.page !== null) {
      citationParts.push(`page ${fact.evidence.page}`);
    }
    if (fact.evidence?.href) {
      citationParts.push(fact.evidence.href);
    }
    const citation = citationParts.length > 0 ? ` (source: ${citationParts.join(", ")})` : "";
    const snippet = truncateSnippet(fact.evidence?.snippet);
    const evidenceLine = snippet ? `\n  Evidence: "${snippet}"` : "";
    return `- ${label}: ${fact.valueText}${citation}${evidenceLine}`;
  });
  return ["Grounded facts extracted from the RFP:", ...lines].join("\n");
}

export async function draftSection({
  sectionId,
  prompt,
  wordTarget,
  vectorStoreId,
  facts,
}: DraftSectionInput): Promise<DraftSectionResult> {
  const client = getOpenAI();
  const factSummary = summarizeFacts(facts);
  const instructions = [
    `You are drafting the "${sectionId}" section of a grant proposal.`,
    "Write in markdown with headings, concise paragraphs, and persuasive but factual language.",
    "Cite supporting materials inline with tags like [RFP], [ORG], [BIO:Name], [PDF:filename].",
    "If information is missing, state clearly what is still needed instead of fabricating.",
  ]
    .filter(Boolean)
    .join(" ");

  const userPrompt = [
    prompt,
    wordTarget ? `Target length: about ${wordTarget} words.` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const tools = vectorStoreId
      ? [
          {
            type: "file_search" as const,
            vector_store_ids: [vectorStoreId],
          },
        ]
      : undefined;
    const requestPayload = {
      model: DRAFT_MODEL,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: instructions,
            },
            ...(factSummary
              ? [
                  {
                    type: "input_text" as const,
                    text: factSummary,
                  },
                ]
              : []),
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: userPrompt,
            },
          ],
        },
      ],
      ...(tools ? { tools } : {}),
      max_output_tokens: 1600,
    };

    // Cast until the OpenAI SDK exposes file_search + tool metadata typings under responses.create.
    const response = await client.responses.create(requestPayload as unknown as Parameters<typeof client.responses.create>[0]);

    const markdown = ((response as { output_text?: string }).output_text ?? "").trim();
    if (markdown && markdown.length > 0) {
      return { markdown };
    }
    throw new Error("Draft response was empty");
  } catch (error) {
    console.error("draftSection failed, falling back to stub", error);
    const intro = `## ${sectionId}\n`;
    const body = `${prompt}\n\n(Word target: ${wordTarget ?? "flex"})`;
    return { markdown: `${intro}${body}` };
  }
}

function computeProvenanceSnapshot(markdown: string): ProvenanceSnapshot {
  const paragraphs = markdown
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  const totalParagraphs = paragraphs.length;
  const paragraphsWithProvenance = paragraphs.filter((paragraph) => /\[[^\]]+\]/.test(paragraph)).length;
  return { paragraphsWithProvenance, totalParagraphs };
}

export const draftSectionTool = tool({
  name: "draft_section",
  description: "Draft a grant section using the provided instructions and optional word target.",
  parameters: z.object({
    sectionId: z.string(),
    prompt: z.string(),
    wordTarget: z.number().nullable(),
  }),
  strict: true,
  async execute(input, runContext) {
    const context = runContext?.context as GrantAgentContext | undefined;
    const slotFacts = context?.coverage?.slots.find((slot) => slot.id === input.sectionId)?.facts ?? null;
    const result = await draftSection({
      ...input,
      vectorStoreId: context?.vectorStoreId,
      facts: slotFacts,
    });
    if (context) {
      context.provenance = computeProvenanceSnapshot(result.markdown);
    }
    return JSON.stringify(result);
  },
});
