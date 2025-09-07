import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
// Avoid importing heavy libs at build time; lazy-import inside handler

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const projectId = String(form.get('projectId') || '')
  const kind = String(form.get('kind') || 'other')
  const file = form.get('file') as File | null
  if (!projectId || !file) return NextResponse.json({ error: 'Missing projectId or file' }, { status: 400 })

  const buf = Buffer.from(await file.arrayBuffer())
  const name = file.name || 'upload.txt'
  const ext = (name.split('.').pop() || '').toLowerCase()

  // Minimal support: txt/md only for v1; PDFs and DOCX can be added later
  let text = ''
  if (ext === 'txt' || ext === 'md') {
    text = buf.toString('utf8')
  } else if (ext === 'pdf') {
    const mod = await import('pdf-parse')
    const pdfParse = (mod as any).default || (mod as any)
    const data = await pdfParse(buf)
    text = data.text || ''
  } else if (ext === 'docx') {
    const mod = await import('mammoth')
    const mammoth = (mod as any).default || (mod as any)
    const res = await mammoth.extractRawText({ buffer: buf })
    text = res.value || ''
  } else {
    return NextResponse.json({ error: 'Only .txt, .md, .pdf, or .docx supported' }, { status: 400 })
  }

  await prisma.upload.create({ data: { projectId, kind, filename: name, text } })
  return NextResponse.json({ ok: true })
}
