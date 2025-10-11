import { tool } from "@openai/agents";
import { z } from "zod";
import { createCoverageSnapshot } from "@/lib/coverage";
import type { GrantAgentContext } from "@/lib/agent-context";
import type { CoverageSnapshot } from "@/lib/types";

export interface NormalizeRfpResult {
  coverage: CoverageSnapshot;
}

export async function normalizeRfp(context: GrantAgentContext): Promise<NormalizeRfpResult> {
  const coverage = createCoverageSnapshot(
    context.coverage?.slots ?? [
      {
        id: "narrative",
        label: "Project narrative",
        status: "missing",
        notes: "Ask for a program overview and goals.",
      },
      {
        id: "budget",
        label: "Budget justification",
        status: "missing",
        notes: "Confirm allowable costs and indirect rates.",
      },
    ],
    "Baseline coverage initialized. Ingest more material to refine the RFP map.",
  );

  context.coverage = coverage;

  return { coverage };
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
