import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logInfo, logError } from '@/lib/logger'

async function mark(projectId: string, entry: any) {
  const p = await prisma.project.findUnique({ where: { id: projectId } })
  const meta: any = p?.meta || {}
  const progress: any[] = Array.isArray(meta.progress) ? meta.progress : []
  progress.push(entry)
  await prisma.project.update({ where: { id: projectId }, data: { meta: { ...meta, progress, lastHeartbeat: new Date().toISOString() } } })
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
    const runId = Math.random().toString(36).slice(2)
    await mark(projectId, { runId, step:'starting', t: new Date().toISOString() })
    logInfo({ runId, projectId, step:'start' }, 'orchestrator start')
    // Mine facts if uploads exist
    const uploads = await prisma.upload.count({ where: { projectId } })
    if (uploads > 0) {
      const t0 = Date.now()
      await postJSON('/api/autopilot/mine-facts', { projectId, runId }, 25000)
      await mark(projectId, { runId, step:'Parsing your docs', t: new Date().toISOString(), durationMs: Date.now()-t0 })
      logInfo({ runId, projectId, step:'facts' }, 'mined facts', { durationMs: Date.now()-t0 })
    }
    {
      const t0 = Date.now()
      await postJSON('/api/autopilot/autodraft', { projectId, runId }, 45000)
      await mark(projectId, { runId, step:'Drafting sections', t: new Date().toISOString(), durationMs: Date.now()-t0 })
      logInfo({ runId, projectId, step:'autodraft' }, 'draft complete', { durationMs: Date.now()-t0 })
    }
    await postJSON('/api/autopilot/coverage', { projectId, runId }, 15000)
    await mark(projectId, { runId, step:'Checking coverage', t: new Date().toISOString() })

    // Fill a couple of gaps per section, then tighten
    const sections = await prisma.section.findMany({ where: { projectId }, orderBy: { order: 'asc' } })
    const total = sections.length
    let idx = 0
    for (const s of sections) {
      idx++
      // Fill one gap per section with timeout safeguards
      const tFill = Date.now()
      try { await postJSON('/api/autopilot/fill-gap', { sectionId: s.id, runId }, 25000); logInfo({ runId, projectId, step:'fill-gap', sectionId: s.id }, 'filled', { idx, durationMs: Date.now()-tFill }) } catch(e){ logError({ runId, projectId, step:'fill-gap', sectionId: s.id }, e, { idx }) }
      await postJSON('/api/autopilot/coverage', { projectId, runId }, 15000)
      await mark(projectId, { runId, step:`Filling gaps ${idx}/${total}`, t: new Date().toISOString(), sectionId: s.id })
    }
    await mark(projectId, 'Filling gaps')
    idx = 0
    for (const s of sections) {
      idx++
      const tT = Date.now()
      try { await postJSON('/api/autopilot/tighten', { sectionId: s.id, runId }, 25000); logInfo({ runId, projectId, step:'tighten', sectionId: s.id }, 'tightened', { idx, durationMs: Date.now()-tT }) } catch(e){ logError({ runId, projectId, step:'tighten', sectionId: s.id }, e, { idx }) }
      await postJSON('/api/autopilot/coverage', { projectId, runId }, 15000)
      await mark(projectId, { runId, step:`Tightening ${idx}/${total}`, t: new Date().toISOString(), sectionId: s.id })
    }
    await mark(projectId, 'Tightening to limits')

    {
      const t0 = Date.now()
      await postJSON('/api/autopilot/mock-review', { projectId, runId }, 35000)
      await mark(projectId, { runId, step:'Getting reviewer feedback', t: new Date().toISOString(), durationMs: Date.now()-t0 })
      logInfo({ runId, projectId, step:'review' }, 'mock review complete', { durationMs: Date.now()-t0 })
    }

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
      await postJSON('/api/autopilot/coverage', { projectId, runId })
    }
    await mark(projectId, { runId, step:'Applying safe fixes', t: new Date().toISOString() })
    await mark(projectId, { runId, step:'done', t: new Date().toISOString() })
    logInfo({ runId, projectId, step:'done' }, 'orchestrator end')
    return NextResponse.json({ ok: true, runId })
  } catch (e: any) {
    logError({ runId: 'n/a', projectId, step:'orchestrator' }, e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
