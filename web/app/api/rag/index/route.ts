import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { client } from "@/lib/ai"

const embedModel = process.env.OPENAI_EMBED_MODEL || "text-embedding-3-small"

function chunkText(text: string, maxWords = 250) {
  const words = text.split(/\s+/)
  const chunks: string[] = []
  let current: string[] = []
  for (const word of words) {
    if (!word) continue
    current.push(word)
    if (current.length >= maxWords) {
      chunks.push(current.join(" "))
      current = []
    }
  }
  if (current.length) {
    chunks.push(current.join(" "))
  }
  return chunks
}

export async function POST(req: NextRequest) {
  const { projectId } = await req.json()
  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 })
  }

  const uploads = await prisma.upload.findMany({ where: { projectId, kind: "source" } })
  if (!uploads.length) {
    await prisma.embedding.deleteMany({ where: { projectId } })
    return NextResponse.json({ ok: true, indexed: 0 })
  }

  await prisma.embedding.deleteMany({ where: { projectId } })

  let indexed = 0
  for (const upload of uploads) {
    const text = upload.text || ""
    if (!text.trim()) continue
    const chunks = chunkText(text)
    for (const chunk of chunks) {
      const embedding = await client.embeddings.create({
        model: embedModel,
        input: chunk,
      })
      const vector = embedding.data?.[0]?.embedding || []
      await prisma.embedding.create({
        data: {
          projectId,
          uploadId: upload.id,
          chunk,
          vector,
        },
      })
      indexed += 1
    }
  }

  return NextResponse.json({ ok: true, indexed })
}
