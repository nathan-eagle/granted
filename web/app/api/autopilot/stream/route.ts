import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { loadPackForProject } from '@/lib/agencyPacks'
import OpenAI from 'openai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type EventPayload = { type: string; data: any }

function sseLine(obj: EventPayload, id?: number) {
  const idPart = typeof id === 'number' ? `id: ${id}\n` : ''
  return `${idPart}data: ${JSON.stringify(obj)}\n\n`
}

async function postJSON(path: string, body: any, timeoutMs = 30000) {
  const base = process.env.APP_URL || 'http://localhost:3000'
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal })
    if (!res.ok) throw new Error(`Failed ${path}: ${res.status}`)
    return await res.json().catch(() => ({}))
  } finally { clearTimeout(t) }
}

async function mark(projectId: string, entry: any) {
  try {
    const p = await prisma.project.findUnique({ where: { id: projectId } })
    const meta: any = p?.meta || {}
    const progress: any[] = Array.isArray(meta.progress) ? meta.progress : []
    progress.push({ ...entry, t: new Date().toISOString() })
    await prisma.project.update({ where: { id: projectId }, data: { meta: { ...meta, progress } } })
  } catch {}
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  if (!projectId) return new Response('Missing projectId', { status: 400 })

  const stream = new ReadableStream({
    start: async (controller) => {
      const enc = new TextEncoder()
      let eventId = 0
      async function send(ev: EventPayload) { controller.enqueue(enc.encode(sseLine(ev, ++eventId))) }
      try {
        // t1: start
        await send({ type: 'status', data: { step: 'start', label: 'Starting…' } })

        // Facts (if uploads exist)
        const uploads = await prisma.upload.findMany({ where: { projectId } })
        if (uploads.length > 0) {
          await send({ type: 'status', data: { step: 'facts', label: 'Parsing your docs…' } })
          await send({ type: 'files', data: { count: uploads.length, names: uploads.map(u => u.filename) } })
          await mark(projectId, { step: 'Parsing your docs' })
          await postJSON('/api/autopilot/mine-facts', { projectId }, 25000)
        }

        // Draft (streaming per section)
        await send({ type: 'status', data: { step: 'drafting', label: 'Drafting sections…' } })
        await mark(projectId, { step: 'Drafting sections' })
        const project = await prisma.project.findUnique({ where: { id: projectId } })
        if (!project) throw new Error('Project not found')
        const pack = await loadPackForProject(project)
        if (!pack) throw new Error('Pack not found')
        const facts: any[] = (project as any).factsJson || []
        const charter = project.charterJson ?? {}
        // Clear previous sections
        await prisma.section.deleteMany({ where: { projectId } })
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
        const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

        for (let i = 0; i < pack.sections.length; i++) {
          const spec = pack.sections[i]
          let acc = ''
          await send({ type: 'section_start', data: { key: spec.id, title: spec.title } })
          const system = `You write SBIR/STTR-style grant sections for non-technical founders.\nWrite ONLY Markdown prose for the section "${spec.title}".\nUse CHARTER and FACTS. When using a fact, embed {{fact:ID}} inline.\nStay within ~${spec.limitWords || 800} words (±10%). Clear, reviewer-friendly voice.`
          const userPayload = { SECTION_ID: spec.id, SECTION_TITLE: spec.title, MUST_COVER: spec.mustCover || [], CHARTER: charter, FACTS: facts }
          const resp = await openai.chat.completions.create({
            model,
            messages: [ { role:'system', content: system }, { role:'user', content: JSON.stringify(userPayload) }],
            temperature: 0.2,
            stream: true as any,
          } as any)
          for await (const chunk of resp as any) {
            const delta = chunk.choices?.[0]?.delta?.content || ''
            if (delta) {
              acc += delta
              await send({ type: 'section_delta', data: { key: spec.id, delta } })
            }
          }
          const words = acc.trim().split(/\s+/).filter(Boolean).length
          await prisma.section.create({ data: { projectId, key: spec.id, title: spec.title, order: i + 1, contentMd: acc } })
          await send({ type: 'section_complete', data: { key: spec.id, title: spec.title, words } })
        }

        // Coverage
        await send({ type: 'status', data: { step: 'coverage', label: 'Checking coverage…' } })
        await mark(projectId, { step: 'Checking coverage' })
        await postJSON('/api/autopilot/coverage', { projectId }, 20000)
        const withCov = await prisma.section.findMany({ where: { projectId }, orderBy: { order: 'asc' } })
        for (const s of withCov) {
          const cov: any = s.coverage || {}
          await send({ type: 'coverage_update', data: { key: s.key, completionPct: cov?.length ? cov.completionPct : cov?.completionPct, missing: cov?.missing || [] } })
        }

        // Fill a small number of gaps
        await send({ type: 'status', data: { step: 'gaps', label: 'Filling gaps…' } })
        await mark(projectId, { step: 'Filling gaps' })
        const secs = await prisma.section.findMany({ where: { projectId }, orderBy: { order: 'asc' } })
        for (const s of secs) {
          try {
            await postJSON('/api/autopilot/fill-gap', { sectionId: s.id }, 25000)
            await postJSON('/api/autopilot/coverage', { projectId }, 15000)
            await send({ type: 'gap_fixed', data: { key: s.key } })
          } catch {}
        }

        // Tighten with guard handled in endpoint; reflect outcome optimistically
        await send({ type: 'status', data: { step: 'tighten', label: 'Tightening to limits…' } })
        await mark(projectId, { step: 'Tightening to limits' })
        for (const s of secs) {
          try {
            const res = await postJSON('/api/autopilot/tighten', { sectionId: s.id }, 25000)
            await postJSON('/api/autopilot/coverage', { projectId }, 15000)
            if (res && res.reverted) await send({ type: 'tighten_reverted', data: { key: s.key } })
            else await send({ type: 'tighten_ok', data: { key: s.key } })
          } catch {
            await send({ type: 'tighten_reverted', data: { key: s.key } })
          }
        }

        // Mock review → Fix list
        await send({ type: 'status', data: { step: 'review', label: 'Getting reviewer feedback…' } })
        await mark(projectId, { step: 'Getting reviewer feedback' })
        await postJSON('/api/autopilot/mock-review', { projectId }, 35000)
        const p = await prisma.project.findUnique({ where: { id: projectId } })
        const fixes: any[] = (p as any)?.meta?.fixList || []
        await send({ type: 'fix_list', data: { items: fixes.slice(0, 8) } })

        // Apply all safe fixes
        await send({ type: 'status', data: { step: 'apply_fixes', label: 'Applying safe fixes…' } })
        await mark(projectId, { step: 'Applying safe fixes' })
        if (fixes && Array.isArray(fixes) && fixes.length) {
          const sections = await prisma.section.findMany({ where: { projectId } })
          const byKey = new Map(sections.map(s => [s.key, s]))
          for (const f of fixes) {
            const patch = String(f.patch || '')
            if (!patch) continue
            const sec = byKey.get(String(f.sectionKey || ''))
            if (!sec) continue
            const before = sec.contentMd || ''
            if (before.includes(patch.slice(0, 60))) continue
            await prisma.section.update({ where: { id: sec.id }, data: { contentMd: before + '\n\n' + patch } })
          }
          await postJSON('/api/autopilot/coverage', { projectId }, 15000)
        }

        // Done
        await send({ type: 'done', data: {} })
        await mark(projectId, { step: 'done' })
      } catch (e: any) {
        await controller.enqueue(new TextEncoder().encode(sseLine({ type: 'error', data: { message: String(e) } })))
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
