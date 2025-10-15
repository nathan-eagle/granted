import { getOpenAI } from "@/lib/openai";
import { attachFilesToVectorStore } from "@/lib/vector-store";
import type { SourceAttachment } from "@/lib/types";
import { persistSources } from "@/lib/session-store";
import { enqueueJob } from "@/lib/jobs";

export const runtime = "nodejs";

function inferFileKind(filename: string, mimeType: string | null): string {
  const lower = filename.toLowerCase();
  if (mimeType?.includes("pdf") || lower.endsWith(".pdf")) return "rfp";
  if (lower.includes("solicitation") || lower.includes("funding") || lower.includes("notice")) {
    return "rfp";
  }
  return "reference";
}

export async function POST(req: Request): Promise<Response> {
  const formData = await req.formData();
  const sessionId = formData.get("sessionId");
  if (!sessionId || typeof sessionId !== "string") {
    return new Response(JSON.stringify({ error: "Missing sessionId" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const files = formData.getAll("files").filter((file): file is File => file instanceof File);
  if (!files.length) {
    return new Response(JSON.stringify({ error: "No files uploaded" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const client = getOpenAI();
    const uploads = await Promise.all(
      files.map(async (file) => {
        const metadata = {
          kind: inferFileKind(file.name, file.type ?? null),
          source: "upload",
          filename: file.name,
        };
        const created = await client.files.create({
          file,
          purpose: "assistants",
        });
        return {
          id: created.id,
          filename: file.name,
          source: {
            id: created.id,
            label: file.name,
            kind: "file" as const,
            meta: metadata,
          } satisfies SourceAttachment,
        };
      }),
    );

    await attachFilesToVectorStore(sessionId, uploads.map((item) => item.id));
    const sources = uploads.map((item) => item.source);
    await persistSources(sessionId, sources);
    await enqueueJob(sessionId, "normalize");

    return new Response(
      JSON.stringify({
        fileIds: uploads.map((item) => item.id),
        sources,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    if (error instanceof Error) {
      console.error("Upload failed", { message: error.message, stack: error.stack });
    } else {
      console.error("Upload failed", error);
    }
    return new Response(JSON.stringify({ error: "Upload failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
