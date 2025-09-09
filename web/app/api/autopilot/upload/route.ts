import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
// Avoid importing heavy libs at build time; lazy-import inside handler

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const projectId = String(form.get('projectId') || '')
  const explicitKind = String(form.get('kind') || '')
  const files = (form.getAll('file') as File[]).filter(Boolean)
  const file = (files[0] as any) as File | null
  if (!projectId || (!file && files.length === 0)) return NextResponse.json({ error: 'Missing projectId or file' }, { status: 400 })

  const results: any[] = []
  async function parseOne(f: File) {
    const buf = Buffer.from(await f.arrayBuffer())
    const name = f.name || 'upload.txt'
    const ext = (name.split('.').pop() || '').toLowerCase()

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
      throw new Error('Only .txt, .md, .pdf, or .docx supported')
    }

    function classify(kind: string, filename: string, body: string) {
      if (kind) return kind
      const fn = filename.toLowerCase()
      const t = (body || '').toLowerCase()
      if (/rfp|solicitation|request\s+for\s+proposals|funding\s+opportunity/.test(fn) || /request\s+for\s+proposals|funding\s+opportunity|nsf\s+sbir|nih\s+sbir/.test(t)) return 'rfp'
      if (/prior|overview|proposal/.test(fn)) return 'prior_proposal'
      if (/cv|resume|biosketch/.test(fn)) return 'cv'
      if (/budget|cost/.test(fn)) return 'budget'
      if (/facilit(y|ies)|equipment/.test(fn)) return 'facilities'
      if (/boiler/.test(fn)) return 'boilerplate'
      return 'other'
    }

    const head = text.slice(0, 12000)
    const kind = classify(explicitKind, name, head)
    // very simple confidence heuristic
    const confidence = kind === 'other' ? 0.5 : 0.9
    const created = await prisma.upload.create({ data: { projectId, kind, filename: name, text, meta: { parsedChars: text.length, confidence } as any } })
    results.push({ uploadId: created.id, filename: name, kind, confidence, parsedChars: text.length })
  }

  if (files.length > 0) {
    for (const f of files) {
      const sizeMB = (f.size || 0) / (1024 * 1024)
      if (sizeMB > 20) return NextResponse.json({ error: 'File too large (max 20MB)' }, { status: 413 })
      await parseOne(f)
    }
  } else if (file) {
    const sizeMB = (file.size || 0) / (1024 * 1024)
    if (sizeMB > 20) return NextResponse.json({ error: 'File too large (max 20MB)' }, { status: 413 })
    await parseOne(file)
  }

  return NextResponse.json({ ok: true, results })
}
