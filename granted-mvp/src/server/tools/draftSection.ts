import { tool } from "@openai/agents";
import { z } from "zod";
import type { GrantAgentContext } from "@/lib/agent-context";
import type { ProvenanceSnapshot } from "@/lib/types";
import { getOpenAI } from "@/lib/openai";

export interface DraftSectionInput {
  sectionId: string;
  prompt: string;
  wordTarget?: number | null;
  vectorStoreId?: string | null;
}

export interface DraftSectionResult {
  markdown: string;
}

const DRAFT_MODEL = process.env.GRANTED_DRAFT_MODEL ?? process.env.GRANTED_MODEL ?? "gpt-4.1";

export async function draftSection({
  sectionId,
  prompt,
  wordTarget,
  vectorStoreId,
}: DraftSectionInput): Promise<DraftSectionResult> {
  const client = getOpenAI();
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
    const response = await client.responses.create({
      model: DRAFT_MODEL,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: instructions,
            },
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
      ...(vectorStoreId
        ? {
            file_search: {
              vector_store_ids: [vectorStoreId],
            },
          }
        : {}),
      max_output_tokens: 1600,
    });

    const markdown = response.output_text?.trim();
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
    const result = await draftSection({
      ...input,
      vectorStoreId: context?.vectorStoreId,
    });
    if (context) {
      context.provenance = computeProvenanceSnapshot(result.markdown);
    }
    return JSON.stringify(result);
  },
});
