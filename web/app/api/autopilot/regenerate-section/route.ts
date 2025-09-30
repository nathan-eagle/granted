import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { loadPackForProject } from '@/lib/agencyPacks'
import { client, defaultModel } from '@/lib/ai'

export async function POST(req: NextRequest) {
  try {
    const { projectId, sectionId } = await req.json()
    if (!projectId || !sectionId) return NextResponse.json({ error: 'Missing projectId or sectionId' }, { status: 400 })
    const section = await prisma.section.findUnique({ where: { id: sectionId } })
    if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    const pack = await loadPackForProject(project)
    const spec = pack?.sections.find(s => s.id === section.key) || { title: section.title, limitWords: 800, mustCover: [] as string[] }
    const facts: any[] = (project as any).factsJson || []
    const charter = project.charterJson ?? {}
    const system = `You write SBIR/STTR-style grant sections. Write ONLY Markdown for "${spec.title}". Use CHARTER and FACTS. Embed {{fact:ID}} when using a fact. Stay within ~${spec.limitWords || 800} words (±10%).`
    const userPayload = { SECTION_ID: section.key, SECTION_TITLE: spec.title, MUST_COVER: (spec as any).mustCover || [], CHARTER: charter, FACTS: facts }
    const r = await client.chat.completions.create({ model: defaultModel, messages: [ {role:'system', content: system}, {role:'user', content: JSON.stringify(userPayload)} ], temperature: 0.2 })
    const md = r.choices[0]?.message?.content || ''
    await prisma.section.update({ where: { id: sectionId }, data: { contentMd: md } })
    // recompute coverage
    await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/autopilot/coverage`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ projectId }) })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
