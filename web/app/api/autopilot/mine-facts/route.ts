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
  // Normalize facts: ensure id, kind present
  const normFacts: any[] = []
  for (const f of (Array.isArray(facts) ? facts : [])) {
    const text = String(f.text || '').trim()
    if (!text) continue
    let id = String(f.id || '').trim()
    if (!id) {
      // simple stable hash for id
      let h = 0
      for (let i = 0; i < Math.min(200, text.length); i++) { h = (h * 31 + text.charCodeAt(i)) >>> 0 }
      id = 'f' + h.toString(36)
    }
    normFacts.push({ id, text, kind: f.kind || 'evidence' })
  }
  // Post-process: try to link each fact to an upload by substring match; capture a short quote
  const uploads = project.uploads || []
  const normalized = uploads.map(u => ({
    id: u.id,
    filename: u.filename,
    text: (u.text || ''),
    lower: (u.text || '').toLowerCase(),
  }))
  for (const f of normFacts) {
    const needle = String(f.text || '').slice(0, 200).toLowerCase()
    let linked: { uploadId: string; quote: string } | null = null
    for (const up of normalized) {
      const idx = needle ? up.lower.indexOf(needle) : -1
      if (idx >= 0) {
        const start = Math.max(0, idx - 80)
        const end = Math.min(up.text.length, idx + needle.length + 80)
        linked = { uploadId: up.id, quote: up.text.slice(start, end) }
        break
      }
    }
    if (linked) f.evidence = linked
  }
  await prisma.project.update({ where: { id: projectId }, data: { factsJson: normFacts } })
  return NextResponse.json({ ok: true, count: normFacts.length })
}
