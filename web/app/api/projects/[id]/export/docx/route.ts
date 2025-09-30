import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function stripHtml(html: string) {
  return (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const projectId = params.id
  if (!projectId) {
    return new Response("Missing projectId", { status: 400 })
  }

  const sections = await prisma.section.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
  })

  if (!sections.length) {
    return new Response("No sections", { status: 404 })
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: sections.flatMap((section) => {
          const content: Paragraph[] = []
          content.push(
            new Paragraph({
              text: section.title,
              heading: HeadingLevel.HEADING_2,
            })
          )

          const raw = section.contentHtml || section.contentMd || ""
          const stripped = stripHtml(raw)
          if (stripped.length) {
            for (const part of stripped.split(/\n+/)) {
              if (part.trim().length) {
                content.push(
                  new Paragraph({
                    children: [new TextRun(part.trim())],
                  })
                )
              }
            }
          } else {
            content.push(new Paragraph({ children: [new TextRun(" ")] }))
          }

          content.push(new Paragraph({}))
          return content
        }),
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="grant-${projectId}.docx"`,
      "Cache-Control": "no-store",
    },
  })
}
