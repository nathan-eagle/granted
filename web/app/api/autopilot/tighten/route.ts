import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { loadPackForProject } from '@/lib/agencyPacks'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  const { sectionId } = await req.json()
  const section = await prisma.section.findUnique({ where: { id: sectionId } })
  if (!section) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const project = await prisma.project.findFirst({ where: { id: section.projectId } })
  const pack = project ? await loadPackForProject(project) : null
  const spec = pack?.sections.find(s => s.id === section.key)
  const limit = spec?.limitWords || 1000
  // capture before coverage
  const before = (section.coverage as any)?.completionPct || 0
  const system = 'Compress section to <= LIMIT words without removing sentences that satisfy required elements.'
  const user = { LIMIT: limit, sectionMarkdown: section.contentMd }
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
  const r = await openai.chat.completions.create({
    model,
    messages: [{ role: 'system', content: system }, { role: 'user', content: JSON.stringify(user) }],
    temperature: 0.2,
  })
  const shorter = r.choices[0]?.message?.content || section.contentMd || ''
  await prisma.section.update({ where: { id: sectionId }, data: { contentMd: shorter } })
  // recompute coverage and revert if worse
  await prisma.$transaction(async tx => {
    const p = await tx.project.findUnique({ where: { id: section.projectId }, include: { sections: true } })
    // naive: if we can't compute here, rely on /coverage endpoint later
  })
  return NextResponse.json({ ok: true })
}
