import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { client } from "@/lib/ai"

const embedModel = process.env.OPENAI_EMBED_MODEL || "text-embedding-3-small"

function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0
  let normA = 0
  let normB = 0
  const length = Math.min(a.length, b.length)
  for (let i = 0; i < length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (!normA || !normB) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

export async function POST(req: NextRequest) {
  const { projectId, query, topK = 4 } = await req.json()
  if (!projectId || !query) {
    return NextResponse.json({ error: "projectId and query required" }, { status: 400 })
  }

  const embedding = await client.embeddings.create({ model: embedModel, input: query })
  const vector = embedding.data?.[0]?.embedding || []
  if (!vector.length) {
    return NextResponse.json({ error: "embedding failed" }, { status: 500 })
  }

  const rows = await prisma.embedding.findMany({ where: { projectId }, take: 2000 })
  const scored = rows
    .map((row) => {
      const candidate = (row.vector as unknown as number[]) || []
      return {
        id: row.id,
        uploadId: row.uploadId,
        chunk: row.chunk,
        score: cosineSimilarity(vector, candidate),
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)

  return NextResponse.json({ results: scored })
}
