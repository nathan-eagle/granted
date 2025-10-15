import { tool } from "@openai/agents";
import { z } from "zod";
import { toFile } from "openai";
import { getOpenAI } from "@/lib/openai";
import { attachFilesToVectorStore } from "@/lib/vector-store";
import type { GrantAgentContext } from "@/lib/agent-context";
import type { SourceAttachment } from "@/lib/types";

const ALLOWED_EXTENSIONS = new Set([
  "c",
  "cpp",
  "css",
  "csv",
  "doc",
  "docx",
  "gif",
  "go",
  "html",
  "java",
  "jpeg",
  "jpg",
  "js",
  "json",
  "md",
  "pdf",
  "php",
  "pkl",
  "png",
  "pptx",
  "py",
  "rb",
  "tar",
  "tex",
  "ts",
  "txt",
  "webp",
  "xlsx",
  "xml",
  "zip",
]);

function inferExtension(filename: string, contentType: string): string {
  const inferred = contentType.toLowerCase();
  if (inferred.includes("pdf")) return "pdf";
  if (inferred.includes("html")) return "html";
  if (inferred.includes("json")) return "json";
  if (inferred.includes("jpeg")) return "jpeg";
  if (inferred.includes("jpg")) return "jpg";
  if (inferred.includes("png")) return "png";
  if (inferred.includes("gif")) return "gif";
  if (inferred.includes("webp")) return "webp";
  if (inferred.includes("csv")) return "csv";
  if (inferred.includes("plain")) return "txt";
  if (inferred.includes("xml")) return "xml";
  if (inferred.includes("zip")) return "zip";
  const lastSegment = filename.toLowerCase();
  if (lastSegment.endsWith(".pdf")) return "pdf";
  if (lastSegment.endsWith(".html") || lastSegment.endsWith(".htm")) return "html";
  return "txt";
}

function inferKindFromName(filename: string, contentType: string): string {
  const lower = filename.toLowerCase();
  if (contentType.includes("pdf") || lower.endsWith(".pdf")) return "rfp";
  if (lower.includes("solicitation") || lower.includes("funding") || lower.includes("grants")) {
    return "rfp";
  }
  return "reference";
}

export async function ingestFromUrls(sessionId: string, urls: string[]): Promise<{
  fileIds: string[];
  sources: SourceAttachment[];
}> {
  const client = getOpenAI();
  const uploads = await Promise.all(
    urls.map(async (url) => {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "GrantedFetcher/1.0 (+https://granted.ai)",
          Accept: "*/*",
        },
        redirect: "follow",
      });
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
      const currentExt = filename.split(".").pop()?.toLowerCase() ?? "";
      if (!currentExt || !ALLOWED_EXTENSIONS.has(currentExt)) {
        const inferredExt = inferExtension(filename, contentType);
        filename = `${filename.replace(/\.+$/, "")}.${inferredExt}`;
      }
      const file = await toFile(fileData, filename, { type: contentType });

      const metadata = {
        kind: inferKindFromName(filename, contentType.toLowerCase()),
        source: "url",
        url,
      };

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
          meta: metadata,
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
