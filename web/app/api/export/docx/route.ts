import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Document, Packer, Paragraph, HeadingLevel, TextRun, PageBreak } from 'docx'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  if (!projectId) return new Response('Missing projectId', { status: 400 })
  const project = await prisma.project.findUnique({ where: { id: projectId }, include: { sections: { orderBy: { order: 'asc' } } } })
  if (!project) return new Response('Not found', { status: 404 })

  const children: Paragraph[] = []
  children.push(new Paragraph({ text: project.name, heading: HeadingLevel.TITLE }))
  children.push(new Paragraph(' '))
  for (let i = 0; i < project.sections.length; i++) {
    const s = project.sections[i]
    if (i > 0) children.push(new Paragraph({ children: [new PageBreak()] }))
    children.push(new Paragraph({ text: s.title, heading: HeadingLevel.HEADING_1 }))
    const text = (s.contentMd || '').replace(/[#*_>`]/g, '')
    children.push(new Paragraph({ children: [new TextRun(text)] }))
  }
  const doc = new Document({ sections: [{ children }] })
  const buf = await Packer.toBuffer(doc)
  return new Response(buf, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Content-Disposition': `attachment; filename="${project.name || 'granted'}.docx"` } })
}

