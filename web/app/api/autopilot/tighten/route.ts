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
  const system = 'Compress section to <= LIMIT words without removing sentences that satisfy required elements.'
  const user = { LIMIT: limit, sectionMarkdown: section.contentMd }
  const r = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'system', content: system }, { role: 'user', content: JSON.stringify(user) }],
    temperature: 0.2,
  })
  const shorter = r.choices[0]?.message?.content || section.contentMd || ''
  await prisma.section.update({ where: { id: sectionId }, data: { contentMd: shorter } })
  return NextResponse.json({ ok: true })
}

