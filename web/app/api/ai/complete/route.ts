import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { completeFromSources } from "../../../../lib/ai"

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  const { projectId, prompt, sourceIds } = await req.json()
  if (!projectId || !prompt) return NextResponse.json({ error: "projectId and prompt required" }, { status: 400 })

  const uploads = sourceIds && Array.isArray(sourceIds) && sourceIds.length
    ? await prisma.upload.findMany({ where: { id: { in: sourceIds as string[] } } })
    : await prisma.upload.findMany({ where: { projectId, kind: "source" }, take: 3, orderBy: { createdAt: "desc" } })

  const sourcesText = uploads.map(s => `# ${s.filename}\n${s.text || ""}`).join("\n\n")
  const output = await completeFromSources({ prompt, sourcesText })
  return NextResponse.json({ output })
}
