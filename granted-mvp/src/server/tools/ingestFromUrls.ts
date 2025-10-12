import { tool } from "@openai/agents";
import { z } from "zod";
import { toFile } from "openai";
import { getOpenAI } from "@/lib/openai";
import { attachFilesToVectorStore } from "@/lib/vector-store";
import type { GrantAgentContext } from "@/lib/agent-context";
import type { SourceAttachment } from "@/lib/types";

export async function ingestFromUrls(sessionId: string, urls: string[]): Promise<{
  fileIds: string[];
  sources: SourceAttachment[];
}> {
  const client = getOpenAI();
  const uploads = await Promise.all(
    urls.map(async (url) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status}`);
      }
      const buffer = await response.arrayBuffer();
      const fileData = new Uint8Array(buffer);
      const contentType = response.headers.get("content-type") ?? "application/octet-stream";
      const rawName = url.split("/").filter(Boolean).pop() ?? "imported";
      let filename = decodeURIComponent(rawName.replace(/[?#].*$/, ""));
      if (!filename || filename.endsWith("/")) {
        filename = "imported";
      }
      if (!filename.includes(".")) {
        if (contentType.includes("pdf")) {
          filename += ".pdf";
        } else if (contentType.includes("html")) {
          filename += ".html";
        } else if (contentType.includes("plain")) {
          filename += ".txt";
        } else if (contentType.includes("json")) {
          filename += ".json";
        } else {
          filename += ".bin";
        }
      }
      const file = await toFile(fileData, filename, { type: contentType });

      const uploaded = await client.files.create({
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
    urls: z.array(z.string().min(1)).min(1),
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
