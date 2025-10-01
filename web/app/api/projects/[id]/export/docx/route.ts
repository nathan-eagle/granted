import { NextRequest } from "next/server"
import { PrismaClient } from "@prisma/client"
import { Document, Packer, Paragraph, HeadingLevel } from "docx"

const prisma = new PrismaClient()

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

  const buf = await Packer.toBuffer(doc)
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename=\"grant_${projectId}.docx\"`,
      "Cache-Control": "no-store",
    },
  })
}
