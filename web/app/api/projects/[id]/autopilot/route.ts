import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { renderTemplate } from "@/lib/promptEngine"
import { completeFromSources } from "@/lib/ai"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const projectId = params.id
  const body = await req.json().catch(()=> ({}))
  const variables = (body?.variables || {}) as Record<string, string>
  const sections = await prisma.section.findMany({ where: { projectId }, orderBy: { order: "asc" } })
  let updated = 0

  for (const s of sections) {
    const meta = (s.contentJson || {}) as any
    const targetWords = meta.targetWords || variables["targetWords"]
    const tpl = meta.promptTemplate || ""
    const prompt = renderTemplate(tpl, { ...variables, targetWords })

    // load per-section sources or fallback to 3 latest project sources
    const secSources = await prisma.sectionSource.findMany({ where: { sectionId: s.id } })
    const uploadIds = secSources.map(x => x.uploadId)
    const uploads = uploadIds.length
      ? await prisma.upload.findMany({ where: { id: { in: uploadIds } } })
      : await prisma.upload.findMany({ where: { projectId, kind: "source" }, orderBy: { createdAt: "desc" }, take: 3 })

    const sourcesText = uploads.map(u => `# ${u.filename}\n${u.text || ""}`).join("\n\n")
    const out = await completeFromSources({ prompt, sourcesText })
    const html = "<p>" + out.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/\n\n/g,"</p><p>").replace(/\n/g,"<br/>") + "</p>"
    const words = out.trim().split(/\s+/).filter(Boolean).length
    await prisma.section.update({ where: { id: s.id }, data: { contentHtml: html, wordCount: words } })
    updated++
  }

  return NextResponse.json({ ok: true, updated })
}
