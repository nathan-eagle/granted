import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  let sectionId = ''
  let text = ''
  if (req.headers.get('content-type')?.includes('application/json')) {
    const body = await req.json()
    sectionId = body.sectionId || ''
    text = body.text || ''
  } else {
    const form = await req.formData()
    sectionId = String(form.get('sectionId') || '')
    text = String(form.get('text') || '')
  }
  const section = await prisma.section.findUnique({ where: { id: sectionId } })
  if (!section) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const updated = (section.contentMd || '') + '\n\n' + String(text || '')
  await prisma.section.update({ where: { id: sectionId }, data: { contentMd: updated } })
  return NextResponse.json({ ok: true })
}
