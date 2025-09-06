import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  const { projectId } = await req.json()
  const project = await prisma.project.findUnique({ where: { id: projectId }, include: { uploads: true } })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const texts = (project.uploads || []).map(u => u.text || '').join('\n\n').slice(0, 30000)
  if (!texts) return NextResponse.json({ ok: true, facts: [] })

  const system = 'Extract atomic facts useful for SBIR writing. Prefer quantitative evidence, resources, prior work, team capabilities. Each fact <= 220 chars. Return JSON array of {id,text,kind}. '
  const user = { texts }
  const r = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [ { role: 'system', content: system }, { role: 'user', content: JSON.stringify(user) } ],
    temperature: 0,
  })
  let facts: any[] = []
  try { facts = JSON.parse(r.choices[0]?.message?.content || '[]') } catch {}
  await prisma.project.update({ where: { id: projectId }, data: { factsJson: facts } })
  return NextResponse.json({ ok: true, count: facts.length })
}

