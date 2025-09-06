import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { loadPackForProject } from '@/lib/agencyPacks'

export async function POST(req: NextRequest) {
  const { projectId } = await req.json()
  const project = await prisma.project.findUnique({ where: { id: projectId }, include: { sections: true } })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const pack = await loadPackForProject(project)
  if (!pack) return NextResponse.json({ error: 'Pack not found' }, { status: 400 })
  const sectionSpec = Object.fromEntries(pack.sections.map(s => [s.id, s]))

  for (const s of project.sections) {
    const spec = sectionSpec[s.key] || { mustCover: [] as string[], limitWords: undefined }
    const content = s.contentMd || ''
    const words = content.trim().split(/\s+/).filter(Boolean).length
    const must = spec.mustCover || []
    const missing: string[] = []
    for (const m of must) {
      const needle = m.toLowerCase()
      const has = content.toLowerCase().includes(needle) || content.includes(`[MISSING: ${m}`)
      if (!has) missing.push(m)
    }
    const completionPct = must.length ? Math.round(((must.length - missing.length) / must.length) * 100) : 100
    await prisma.section.update({ where: { id: s.id }, data: { coverage: { length: { words }, missing, completionPct } } as any })
  }
  return NextResponse.json({ ok: true })
}

