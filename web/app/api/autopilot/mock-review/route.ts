import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  const { projectId } = await req.json()
  const project = await prisma.project.findUnique({ where: { id: projectId }, include: { sections: { orderBy: { order: 'asc' } } } })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const payload = { sections: project.sections.map(s => ({ key: s.key, title: s.title, md: s.contentMd })) }
  const system = 'Act as SBIR reviewers and propose fixes. Return JSON: {fixes:[{sectionKey,label,rationale,impact,patch?}]}.'
  const r = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [ { role: 'system', content: system }, { role: 'user', content: JSON.stringify(payload) } ],
    temperature: 0.2,
  })
  let out: any = {}
  try { out = JSON.parse(r.choices[0]?.message?.content || '{}') } catch {}
  const meta = Object.assign({}, project.meta || {}, { fixList: out.fixes || [] })
  await prisma.project.update({ where: { id: projectId }, data: { meta } })
  return NextResponse.json({ ok: true, count: (out.fixes || []).length })
}

