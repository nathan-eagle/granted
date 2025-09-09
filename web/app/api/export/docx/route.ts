import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function mdToTextParagraphs(md: string): Paragraph[] {
  const lines = String(md || '').split(/\r?\n/)
  const paras: Paragraph[] = []
  let buf: string[] = []
  function flush(){
    if (!buf.length) return
    const text = buf.join('\n').replace(/\*\*|__/g, '').replace(/\*/g, '')
    paras.push(new Paragraph({ children: [ new TextRun({ text, size: 24 }) ], spacing: { after: 180 } }))
    buf = []
  }
  for (const ln of lines) {
    if (!ln.trim()) { flush(); continue }
    buf.push(ln)
  }
  flush()
  return paras
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId') || ''
  if (!projectId) return new Response('Missing projectId', { status: 400 })

  const project = await prisma.project.findUnique({ where: { id: projectId }, include: { sections: { orderBy: { order: 'asc' } }, uploads: true } })
  if (!project) return new Response('Not found', { status: 404 })

  // Build References map from {{fact:ID}} markers → [n]
  const facts: any[] = (project as any).factsJson || []
  const byFact = new Map(facts.map(f => [String(f.id||''), f]))
  const seen: string[] = []
  function citeId(id: string){
    if (!seen.includes(id)) seen.push(id)
    return seen.indexOf(id) + 1
  }

  const doc = new Document({ sections: [ { children: [] } ] })
  const children = doc.Sections[0].children

  // Title
  children.push(new Paragraph({ text: project.name, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { after: 320 } }))

  for (const s of project.sections) {
    children.push(new Paragraph({ text: s.title, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 } }))
    // Replace markers with [n]
    let body = String(s.contentMd || '')
    body = body.replace(/\{\{fact:([^}]+)\}\}/g, (_m, id) => `[${citeId(String(id))}]`)
    mdToTextParagraphs(body).forEach(p => children.push(p))
  }

  if (seen.length) {
    children.push(new Paragraph({ text: 'References', heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 } }))
    const uploads = project.uploads
    for (let i = 0; i < seen.length; i++) {
      const id = seen[i]
      const f: any = byFact.get(id)
      if (!f) continue
      const upName = f?.evidence?.uploadId ? (uploads.find(u => u.id === f.evidence.uploadId)?.filename || '') : ''
      const pageStr = f?.evidence?.page ? ` p.${f.evidence.page}` : ''
      const line = `[${i+1}] ${f.text}${upName ? ` (Source: ${upName}${pageStr})` : ''}`
      children.push(new Paragraph({ children: [ new TextRun({ text: line, size: 22 }) ], spacing: { after: 120 } }))
    }
  }

  const buf = await Packer.toBuffer(doc)
  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(project.name || 'proposal')}.docx"`,
      'Cache-Control': 'no-store',
    },
  })
}

