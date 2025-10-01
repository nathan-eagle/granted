import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { Document, Packer, Paragraph, HeadingLevel } from "docx"

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const projectId = params.id
  const sections = await prisma.section.findMany({ where: { projectId }, orderBy: { order: "asc" } })

  const doc = new Document({
    sections: [
      {
        children: sections.flatMap((s) => {
          const title = new Paragraph({ text: s.title, heading: HeadingLevel.HEADING_1 })
          const text = (s.contentHtml || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
          const paras = text ? text.split(/\n\n+/).map(t => new Paragraph(t)) : [new Paragraph("")]
          return [title, ...paras, new Paragraph("")]
        }),
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)
  const base = buffer instanceof ArrayBuffer
    ? buffer
    : buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  const bytes = new Uint8Array(base as ArrayBuffer)
  const blob = new Blob([bytes.buffer], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  })
  return new Response(blob, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename=\"grant_${projectId}.docx\"`,
      "Cache-Control": "no-store",
    },
  })
}
