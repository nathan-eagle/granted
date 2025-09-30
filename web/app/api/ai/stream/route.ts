import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { client, defaultModel } from "../../../../lib/ai"

export async function POST(req: NextRequest) {
  const { projectId, prompt, sourceIds } = await req.json()
  if (!projectId || !prompt) {
    return new Response(JSON.stringify({ error: "projectId and prompt required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const uploads = sourceIds && Array.isArray(sourceIds) && sourceIds.length
    ? await prisma.upload.findMany({ where: { id: { in: sourceIds as string[] } } })
    : await prisma.upload.findMany({ where: { projectId, kind: "source" }, take: 3, orderBy: { createdAt: "desc" } })

  const sourcesText = uploads.map((s) => `# ${s.filename}\n${s.text || ""}`).join("\n\n")

  const sys = "You are an expert grant-writing assistant. Use sources faithfully and acknowledge uncertainty."
  const user = `Prompt:\n${prompt}\n\nSources:\n${sourcesText}`

  const streamed = await client.responses.stream({
    model: defaultModel,
    input: [
      { role: "system", content: sys },
      { role: "user", content: user },
    ],
  } as any)

  const readable = streamed.toReadableStream()

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  })
}
