import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { sectionId, text } = await req.json()
  const section = await prisma.section.findUnique({ where: { id: sectionId } })
  if (!section) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const updated = (section.contentMd || '') + '\n\n' + String(text || '')
  await prisma.section.update({ where: { id: sectionId }, data: { contentMd: updated } })
  return NextResponse.json({ ok: true })
}

