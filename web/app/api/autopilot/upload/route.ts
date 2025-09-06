import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

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
  } else {
    return NextResponse.json({ error: 'Only .txt or .md supported in v1' }, { status: 400 })
  }

  await prisma.upload.create({ data: { projectId, kind, filename: name, text } })
  return NextResponse.json({ ok: true })
}

