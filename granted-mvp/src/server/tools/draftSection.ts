import { tool } from "@openai/agents";
import { z } from "zod";
import type { GrantAgentContext } from "@/lib/agent-context";
import type { ProvenanceSnapshot } from "@/lib/types";

export interface DraftSectionInput {
  sectionId: string;
  prompt: string;
  wordTarget?: number | null;
}

export interface DraftSectionResult {
  markdown: string;
}

export async function draftSection({ sectionId, prompt, wordTarget }: DraftSectionInput): Promise<DraftSectionResult> {
  const intro = `## ${sectionId}\n`;
  const body = `${prompt}\n\n(Word target: ${wordTarget ?? "flex"})`;
  return { markdown: `${intro}${body}` };
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
    const result = await draftSection(input);
    const context = runContext?.context as GrantAgentContext | undefined;
    if (context) {
      context.provenance = computeProvenanceSnapshot(result.markdown);
    }
    return JSON.stringify(result);
  },
});
