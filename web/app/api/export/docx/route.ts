import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Document, Packer, Paragraph, HeadingLevel, TextRun, PageBreak, Table, TableRow, TableCell, WidthType } from 'docx'
import removeMd from 'remove-markdown'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  if (!projectId) return new Response('Missing projectId', { status: 400 })
  const project = await prisma.project.findUnique({ where: { id: projectId }, include: { sections: { orderBy: { order: 'asc' } } } })
  if (!project) return new Response('Not found', { status: 404 })

  const children: (Paragraph | Table)[] = []
  // Title page
  children.push(new Paragraph({ text: project.name, heading: HeadingLevel.TITLE }))
  children.push(new Paragraph({ text: new Date().toLocaleDateString() }))
  children.push(new Paragraph(' '))
  // Track citation order across sections
  const factOrder: string[] = []
  const facts: any[] = ((project as any).factsJson as any[]) || []
  const byId = new Map(facts.map(f => [String(f.id||''), f]))

  for (let i = 0; i < project.sections.length; i++) {
    const s = project.sections[i]
    if (i > 0) children.push(new Paragraph({ children: [new PageBreak()] }))
    children.push(new Paragraph({ text: s.title, heading: HeadingLevel.HEADING_1 }))
    // Replace {{fact:ID}} with [n]
    const md = String(s.contentMd || '')
    const replaced = md.replace(/\{\{fact:([^}]+)\}\}/g, (_m, id) => {
      const sid = String(id)
      if (!factOrder.includes(sid)) factOrder.push(sid)
      const n = factOrder.indexOf(sid) + 1
      return ` [${n}] `
    })
    const text = removeMd(replaced)
    // If this is the budget section and Project.meta.budget exists, render a table
    const isBudget = /budget/i.test(s.key) || /budget/i.test(s.title)
    const meta: any = project as any
    const budget = meta?.meta?.budget
    if (isBudget && budget && Array.isArray(budget.items) && budget.items.length) {
      const rows: TableRow[] = [
        new TableRow({ children: [
          new TableCell({ children:[new Paragraph('Category')], width:{ size:33, type: WidthType.PERCENTAGE}}),
          new TableCell({ children:[new Paragraph('Amount')], width:{ size:33, type: WidthType.PERCENTAGE}}),
          new TableCell({ children:[new Paragraph('Note')], width:{ size:34, type: WidthType.PERCENTAGE}}),
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
  if (factOrder.length) {
    children.push(new Paragraph({ children: [new PageBreak()] }))
    children.push(new Paragraph({ text: 'References', heading: HeadingLevel.HEADING_1 }))
    for (let i = 0; i < factOrder.length; i++) {
      const id = factOrder[i]
      const f: any = byId.get(id)
      if (!f) continue
      const fn = f?.evidence?.uploadId ? (((project as any).uploads || []).find((u:any)=>u.id===f.evidence.uploadId)?.filename || '') : ''
      const line = `[${i+1}] ${f.text || ''}${fn ? ` (Source: ${fn})` : ''}`
      children.push(new Paragraph({ children: [new TextRun(line)] }))
    }
  }
  const doc = new Document({ sections: [{ children }] })
  const buf = await Packer.toBuffer(doc)
  const u8 = new Uint8Array(buf)
  return new Response(u8, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Content-Disposition': `attachment; filename="${project.name || 'granted'}.docx"` } })
}
