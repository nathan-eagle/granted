import { tool } from "@openai/agents";
import { z } from "zod";
import { COVERAGE_TEMPLATES, createCoverageSnapshot } from "@/lib/coverage";
import type { GrantAgentContext } from "@/lib/agent-context";
import type { CoverageSnapshot, FixNextSuggestion } from "@/lib/types";
import { saveCoverageSnapshot } from "@/lib/session-store";

export interface CoverageAndNextResult {
  coverage: CoverageSnapshot;
  fixNext: FixNextSuggestion;
}

const PRIORITY = new Map(COVERAGE_TEMPLATES.map((template) => [template.id, template.priority]));
export function selectFixNext(coverage: CoverageSnapshot): FixNextSuggestion {
  const sorted = [...coverage.slots].sort((a, b) => {
    const aPriority = PRIORITY.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const bPriority = PRIORITY.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return a.label.localeCompare(b.label);
  });

  for (const slot of sorted) {
    const question = slot.questions?.[0];
    if (question) {
      return {
        id: slot.id,
        label: question.prompt,
        description: `Resolve ${slot.label} to keep drafting moving.`,
        kind: "question",
      };
    }
  }

  return {
    id: "export",
    label: "Export a DOCX draft",
    kind: "export",
    description: "Everything is mapped. Generate a downloadable draft.",
  };
}

export async function coverageAndNext(context: GrantAgentContext): Promise<CoverageAndNextResult> {
  const creatingBaseline = !context.coverage;
  const coverage = context.coverage ??
    createCoverageSnapshot(
      COVERAGE_TEMPLATES.map((template, index) => ({
        id: template.id,
        label: template.label,
        status: index === 0 ? "partial" : "missing",
        notes: template.notes,
      })),
      "Baseline coverage initialized. Share the solicitation and project context to refine the map.",
    );

  const fixNext = selectFixNext(coverage);
  context.coverage = coverage;
  context.fixNext = fixNext;
  if (creatingBaseline || coverage) {
    await saveCoverageSnapshot(context.sessionId, coverage);
  }
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
