import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'
import { loadPackForProject } from '@/lib/agencyPacks'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  const { projectId } = await req.json()
  const project = await prisma.project.findUnique({ where: { id: projectId }, include: { sections: { orderBy: { order: 'asc' } } } })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const pack = await loadPackForProject(project)
  const payload = { sections: project.sections.map(s => ({ key: s.key, title: s.title, md: s.contentMd })), rubric: pack?.rubric || [] }
  const system = 'Act as SBIR reviewers using provided rubric. Propose fixes that raise score. Return JSON: {fixes:[{sectionKey,label,rationale,impact:"High|Med|Low",criterionId?:string,patch?:string}]}. Prefer including criterionId that maps to rubric.id.'
  const r = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [ { role: 'system', content: system }, { role: 'user', content: JSON.stringify(payload) } ],
    temperature: 0.2,
  })
  let out: any = {}
  try { out = JSON.parse(r.choices[0]?.message?.content || '{}') } catch {}
  const fixes: any[] = Array.isArray(out.fixes) ? out.fixes : []
  // Weight ordering by rubric weights and impact
  const weights = new Map<string, number>((pack?.rubric || []).map(r => [String(r.id), Number(r.weight || 0)]))
  function scoreFix(f: any) {
    const impact = String(f.impact || 'Med').toLowerCase()
    const factor = impact === 'high' ? 3 : impact === 'low' ? 1 : 2
    const w = weights.get(String(f.criterionId || '')) || 1
    return w * factor
  }
  fixes.sort((a,b) => scoreFix(b) - scoreFix(a))
  const meta = Object.assign({}, project.meta || {}, { fixList: fixes })
  await prisma.project.update({ where: { id: projectId }, data: { meta } })
  return NextResponse.json({ ok: true, count: fixes.length })
}
