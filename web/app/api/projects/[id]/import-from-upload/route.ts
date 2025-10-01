import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

function splitHtmlToSections(html: string) {
  const anchors: { index: number; title: string }[] = []
  const headingRegex = /<(h2|h3)[^>]*>(.*?)<\/\1>/gi
  let match: RegExpExecArray | null
  while ((match = headingRegex.exec(html))) {
    const title = match[2].replace(/<[^>]+>/g, "").trim() || "Section"
    anchors.push({ index: match.index, title })
  }

  if (!anchors.length) {
    return [{ title: "Imported Document", html }]
  }

  const sections: { title: string; html: string }[] = []
  for (let i = 0; i < anchors.length; i++) {
    const start = anchors[i].index
    const end = i + 1 < anchors.length ? anchors[i + 1].index : html.length
    const chunk = html.slice(start, end)
    sections.push({ title: anchors[i].title, html: chunk })
  }
  return sections
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { uploadId } = await req.json()
  const projectId = params.id

  if (!uploadId) {
    return NextResponse.json({ error: "uploadId required" }, { status: 400 })
  }

  const upload = await prisma.upload.findUnique({ where: { id: uploadId } })
  if (!upload) {
    return NextResponse.json({ error: "upload not found" }, { status: 404 })
  }

  let html = ""
  try {
    if (upload.url && upload.filename?.toLowerCase().endsWith(".docx")) {
      const res = await fetch(upload.url)
      const arrayBuffer = await res.arrayBuffer()
      const mammoth = await import("mammoth")
      html = (await mammoth.convertToHtml({ arrayBuffer })).value
    } else {
      html = (upload.text || "").replace(/\n/g, "<br/>")
    }
  } catch (error) {
    console.error("Failed to convert upload", error)
    html = (upload.text || "").replace(/\n/g, "<br/>")
  }

  const sections = splitHtmlToSections(html)

  await prisma.section.deleteMany({ where: { projectId } })

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i]
    const text = section.html.replace(/<[^>]+>/g, " ")
    const words = text.split(/\s+/).filter(Boolean).length
    const key = (section.title || `section-${i + 1}`)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || `section-${i + 1}`
    await prisma.section.create({
      data: {
        projectId,
        key,
        title: section.title || `Section ${i + 1}`,
        order: i,
        contentHtml: section.html,
        wordCount: words,
      },
    })
  }

  return NextResponse.json({ count: sections.length })
}
