import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Document, Packer, Paragraph, HeadingLevel, TextRun, PageBreak, Table, TableRow, TableCell, WidthType } from 'docx'

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
    // If this is the budget section and Project.meta.budget exists, render a table
    const isBudget = /budget/i.test(s.key) || /budget/i.test(s.title)
    const meta: any = project as any
    const budget = meta?.meta?.budget
    if (isBudget && budget && Array.isArray(budget.items) && budget.items.length) {
      const rows: TableRow[] = [
        new TableRow({ children: [
          new TableCell({ children:[new Paragraph('Category')], width:{ size:33, type: WidthType.PERCENT}}),
          new TableCell({ children:[new Paragraph('Amount')], width:{ size:33, type: WidthType.PERCENT}}),
          new TableCell({ children:[new Paragraph('Note')], width:{ size:34, type: WidthType.PERCENT}}),
        ]})
      ]
      for (const it of budget.items) {
        rows.push(new TableRow({ children: [
          new TableCell({ children:[new Paragraph(String(it.category||''))] }),
          new TableCell({ children:[new Paragraph(String(it.amount||''))] }),
          new TableCell({ children:[new Paragraph(String(it.note||''))] }),
        ] }))
      }
      children.push(new Table({ rows }))
      children.push(new Paragraph({ children: [new TextRun(`Total: ${budget.total || ''}`)] }))
      if (text.trim()) children.push(new Paragraph({ children: [new TextRun(text)] }))
    } else {
      children.push(new Paragraph({ children: [new TextRun(text)] }))
    }
  }
  const doc = new Document({ sections: [{ children }] })
  const buf = await Packer.toBuffer(doc)
  return new Response(buf, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Content-Disposition': `attachment; filename="${project.name || 'granted'}.docx"` } })
}
