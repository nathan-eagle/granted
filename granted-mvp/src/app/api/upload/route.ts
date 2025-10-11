import { getOpenAI } from "@/lib/openai";
import { attachFilesToVectorStore } from "@/lib/vector-store";
import type { SourceAttachment } from "@/lib/types";

export const runtime = "nodejs";

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
          } satisfies SourceAttachment,
        };
      }),
    );

    await attachFilesToVectorStore(sessionId, uploads.map((item) => item.id));

    return new Response(
      JSON.stringify({
        fileIds: uploads.map((item) => item.id),
        sources: uploads.map((item) => item.source),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Upload failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
