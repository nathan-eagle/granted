import { tool } from "@openai/agents";
import { z } from "zod";
import { ensureVectorStore } from "@/lib/vector-store";
import type { GrantAgentContext } from "@/lib/agent-context";
import { normalizeRfp } from "@/server/tools/normalizeRfp";
import { coverageAndNext } from "@/server/tools/coverageAndNext";

export const getCoverageTool = tool({
  name: "get_coverage",
  description: "Recompute coverage and return the current snapshot for a session.",
  parameters: z.object({ sessionId: z.string() }),
  strict: true,
  async execute({ sessionId }) {
    const { vectorStoreId } = await ensureVectorStore(sessionId);
    const context: GrantAgentContext = {
      sessionId,
      vectorStoreId,
    };
    await normalizeRfp(context);
    const { coverage, fixNext } = await coverageAndNext(context);
    return JSON.stringify({ coverage, fixNext });
  },
});

