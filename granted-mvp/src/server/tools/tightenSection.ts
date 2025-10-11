import { tool } from "@openai/agents";
import { z } from "zod";
import { analyzeLength } from "@/lib/tighten";
import type { GrantAgentContext } from "@/lib/agent-context";
import type { TightenSectionSnapshot } from "@/lib/types";

export interface TightenSectionInput {
  markdown: string;
  limitWords?: number | null;
}

export interface TightenSectionResult {
  withinLimit: boolean;
  wordCount: number;
  pageEstimate: number;
}

export function tightenSection({ markdown, limitWords }: TightenSectionInput): TightenSectionResult {
  return analyzeLength(markdown, limitWords ?? undefined);
}

function toSnapshot(input: TightenSectionInput, result: TightenSectionResult): TightenSectionSnapshot {
  return {
    withinLimit: result.withinLimit,
    wordCount: result.wordCount,
    pageEstimate: result.pageEstimate,
    limitWords: input.limitWords ?? undefined,
  };
}

export const tightenSectionTool = tool({
  name: "tighten_section",
  description: "Evaluate a draft section against word and page limits.",
  parameters: z.object({
    markdown: z.string(),
    limitWords: z.number().nullable(),
  }),
  strict: true,
  async execute(input, runContext) {
    const result = tightenSection(input);
    const context = runContext?.context as GrantAgentContext | undefined;
    if (context) {
      context.tighten = toSnapshot(input, result);
    }
    return JSON.stringify(result);
  },
});
