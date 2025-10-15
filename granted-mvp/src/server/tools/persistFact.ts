import { tool } from "@openai/agents";
import { z } from "zod";
import { persistUserFact } from "@/server/facts/persistUserFact";

export const persistFactTool = tool({
  name: "persist_fact",
  description: "Record a high-confidence fact provided by the user for coverage tracking.",
  parameters: z.object({
    sessionId: z.string(),
    slotId: z.string(),
    valueText: z.string(),
    answerKind: z.enum(["text", "date", "url"]),
  }),
  strict: true,
  async execute({ sessionId, slotId, valueText, answerKind }) {
    await persistUserFact({
      sessionId,
      slotId,
      valueText,
      answerKind,
      annotations: null,
    });
    return JSON.stringify({ ok: true });
  },
});

