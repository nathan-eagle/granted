import { tool } from "@openai/agents";
import { z } from "zod";
import { openai } from "@/lib/openai";
import { attachFilesToVectorStore } from "@/lib/vector-store";
import type { GrantAgentContext } from "@/lib/agent-context";
import type { SourceAttachment } from "@/lib/types";

export async function ingestFromUrls(sessionId: string, urls: string[]): Promise<{
  fileIds: string[];
  sources: SourceAttachment[];
}> {
  const uploads = await Promise.all(
    urls.map(async (url) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status}`);
      }
      const buffer = await response.arrayBuffer();
      const filename = url.split("/").filter(Boolean).pop() ?? "imported";
      const file = new File([buffer], filename, {
        type: response.headers.get("content-type") ?? "application/octet-stream",
      });

      const uploaded = await openai.files.create({
        file,
        purpose: "assistants",
      });

      return {
        id: uploaded.id,
        source: {
          id: uploaded.id,
          label: filename,
          kind: "url" as const,
          href: url,
        },
      };
    }),
  );

  const fileIds = uploads.map((item) => item.id);
  await attachFilesToVectorStore(sessionId, fileIds);

  return {
    fileIds,
    sources: uploads.map((item) => item.source),
  };
}

export const ingestFromUrlsTool = tool({
  name: "ingest_from_urls",
  description: "Fetch remote URLs and add them to the current session's vector store for search.",
  parameters: z.object({
    sessionId: z.string().min(1, "sessionId is required"),
    urls: z.array(z.string().url()).min(1),
  }),
  strict: true,
  async execute({ sessionId, urls }, context) {
    const result = await ingestFromUrls(sessionId, urls);
    if (context) {
      const runContext = context as unknown as { context?: GrantAgentContext };
      if (runContext.context) {
        runContext.context.sources = [...(runContext.context.sources ?? []), ...result.sources];
      }
    }
    return JSON.stringify(result);
  },
});
