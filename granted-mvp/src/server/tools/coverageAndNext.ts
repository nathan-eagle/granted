import { tool } from "@openai/agents";
import { z } from "zod";
import { createCoverageSnapshot } from "@/lib/coverage";
import type { GrantAgentContext } from "@/lib/agent-context";
import type { CoverageSnapshot, FixNextSuggestion } from "@/lib/types";

export interface CoverageAndNextResult {
  coverage: CoverageSnapshot;
  fixNext: FixNextSuggestion;
}

export function selectFixNext(coverage: CoverageSnapshot): FixNextSuggestion {
  const missing = coverage.slots.find((slot) => slot.status !== "complete");
  if (!missing) {
    return {
      id: "export",
      label: "Export a DOCX draft",
      kind: "export",
      description: "Everything is mapped. Generate a downloadable draft.",
    };
  }

  return {
    id: missing.id,
    label: `Provide details for ${missing.label}`,
    description: missing.notes,
    kind: "question",
  };
}

export async function coverageAndNext(context: GrantAgentContext): Promise<CoverageAndNextResult> {
  const coverage = context.coverage ??
    createCoverageSnapshot([
      {
        id: "narrative",
        label: "Project narrative",
        status: "missing",
        notes: "Summarize the project vision and beneficiaries.",
      },
      {
        id: "org-capacity",
        label: "Organizational capacity",
        status: "partial",
        notes: "Upload bios and past performance evidence.",
      },
    ]);

  const fixNext = selectFixNext(coverage);
  context.coverage = coverage;
  context.fixNext = fixNext;
  return { coverage, fixNext };
}

export const coverageAndNextTool = tool({
  name: "coverage_and_next",
  description: "Summarize coverage progress and emit the next best action.",
  parameters: z.object({ sessionId: z.string() }),
  strict: true,
  async execute(_input, runContext) {
    const context = runContext?.context as GrantAgentContext | undefined;
    if (!context) {
      throw new Error("Missing grant agent context");
    }
    const result = await coverageAndNext(context);
    return JSON.stringify(result);
  },
});
