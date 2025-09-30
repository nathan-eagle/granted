import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { client, defaultModel } from '@/lib/ai'

export async function POST(req: NextRequest) {
  const { sectionId } = await req.json()
  const section = await prisma.section.findUnique({ where: { id: sectionId } })
  if (!section) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const coverage: any = section.coverage || {}
  const missing: string[] = coverage.missing || []
  const gap = missing[0] || 'General'
  const system = 'Patch one missing slot in SBIR section. Write 2–5 concise sentences in markdown. Avoid repetition.'
  const user = { gapLabel: gap, sectionMarkdown: section.contentMd }
  const r = await client.chat.completions.create({
    model: defaultModel,
    messages: [{ role: 'system', content: system }, { role: 'user', content: JSON.stringify(user) }],
    temperature: 0.2,
  })
  const patch = r.choices[0]?.message?.content || ''
  const updated = (section.contentMd || '') + '\n\n' + patch
  await prisma.section.update({ where: { id: sectionId }, data: { contentMd: updated } })
  return NextResponse.json({ ok: true })
}
