import { tool } from "@openai/agents";
import { z } from "zod";
import { enqueueJob } from "@/lib/jobs";

export const enqueueJobTool = tool({
  name: "enqueue_job",
  description: "Enqueue a background job for the current session (normalize, autodraft, tighten, ingest).",
  parameters: z.object({
    sessionId: z.string(),
    kind: z.enum(["normalize", "autodraft", "tighten", "ingest_url", "ingest_file"]),
    payload: z.record(z.any()),
  }),
  strict: true,
  async execute({ sessionId, kind, payload }) {
    await enqueueJob(sessionId, kind, payload);
    return JSON.stringify({ ok: true });
  },
});
