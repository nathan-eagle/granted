import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

async function mark(projectId: string, label: string) {
  const p = await prisma.project.findUnique({ where: { id: projectId } })
  const meta: any = p?.meta || {}
  const progress: string[] = Array.isArray(meta.progress) ? meta.progress : []
  if (!progress.includes(label)) progress.push(label)
  await prisma.project.update({ where: { id: projectId }, data: { meta: { ...meta, progress } } })
}

async function postJSON(path: string, body: any, timeoutMs = 30000) {
  const base = process.env.APP_URL || 'http://localhost:3000'
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal })
    if (!res.ok) throw new Error(`Failed ${path}: ${res.status}`)
    return await res.json().catch(() => ({}))
  } finally {
    clearTimeout(t)
  }
}

export async function POST(req: NextRequest) {
  const { projectId } = await req.json()
  if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })
  try {
    await mark(projectId, 'starting')
    // Mine facts if uploads exist
    const uploads = await prisma.upload.count({ where: { projectId } })
    if (uploads > 0) {
      await postJSON('/api/autopilot/mine-facts', { projectId })
      await mark(projectId, 'Parsing your docs')
    }
    await postJSON('/api/autopilot/autodraft', { projectId })
    await mark(projectId, 'Drafting sections')
    await postJSON('/api/autopilot/coverage', { projectId })
    await mark(projectId, 'Checking coverage')

    // Fill a couple of gaps per section, then tighten
    const sections = await prisma.section.findMany({ where: { projectId }, orderBy: { order: 'asc' } })
    const total = sections.length
    let idx = 0
    for (const s of sections) {
      idx++
      // Fill one gap per section with timeout safeguards
      try { await postJSON('/api/autopilot/fill-gap', { sectionId: s.id }, 25000) } catch {}
      await postJSON('/api/autopilot/coverage', { projectId }, 15000)
      await mark(projectId, `Filling gaps ${idx}/${total}`)
    }
    await mark(projectId, 'Filling gaps')
    idx = 0
    for (const s of sections) {
      idx++
      try { await postJSON('/api/autopilot/tighten', { sectionId: s.id }, 25000) } catch {}
      await postJSON('/api/autopilot/coverage', { projectId }, 15000)
      await mark(projectId, `Tightening ${idx}/${total}`)
    }
    await mark(projectId, 'Tightening to limits')

    await postJSON('/api/autopilot/mock-review', { projectId })
    await mark(projectId, 'Getting reviewer feedback')

    // Apply all safe fixes (reuse existing applyAll on page is server action; implement here)
    const p = await prisma.project.findUnique({ where: { id: projectId }, include: { sections: true } })
    const fixes: any[] = (p?.meta as any)?.fixList || []
    if (p?.sections && Array.isArray(fixes)) {
      const byKey = new Map(p.sections.map(s => [s.key, s]))
      for (const f of fixes) {
        const patch = String(f.patch || '')
        const sec = byKey.get(String(f.sectionKey || ''))
        if (!patch || !sec) continue
        const before = sec.contentMd || ''
        if (before.includes(patch.slice(0, 60))) continue
        await prisma.section.update({ where: { id: sec.id }, data: { contentMd: before + '\n\n' + patch } })
      }
      await postJSON('/api/autopilot/coverage', { projectId })
    }
    await mark(projectId, 'Applying safe fixes')

    await mark(projectId, 'done')
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
