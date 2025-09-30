import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { loadPackForProject } from '@/lib/agencyPacks'
import { client, defaultModel } from '@/lib/ai'

export async function POST(req: NextRequest) {
  try {
    const { projectId } = await req.json()
    if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const pack = await loadPackForProject(project)
    if (!pack) return NextResponse.json({ error: 'Pack not found' }, { status: 400 })

    const charter = project.charterJson ?? {}
    const system = `You are drafting a FIRST-CUT SBIR PHASE I proposal for non-technical users.
Return ONLY valid JSON in the schema provided by the user. Use the agency pack:
- Use its sections and must-cover lists as required slots.
- If any slot lacks input evidence, insert a bracketed TODO: [MISSING: <slot>].
- Write clear, reviewer-friendly prose. Avoid jargon. Do not exceed word limits by >10%.`
    const user = {
      AGENCY_PACK: pack,
      CHARTER: charter,
      RFP_TEXT: null,
      RETURN_SCHEMA: {
        title: 'string',
        sections: [{ key: 'string', title: 'string', order: 0, contentMd: 'string', slotsStatus: [{ label: 'string', status: 'ok|missing' }] }],
      },
    }

    const completion = await client.chat.completions.create({
      model: defaultModel,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: JSON.stringify(user) },
      ],
      temperature: 0.2,
    })
    const raw = completion.choices[0]?.message?.content || '{}'
    let parsed: any
    try { parsed = JSON.parse(raw) } catch { parsed = { title: 'Draft', sections: [] } }

    const sections = Array.isArray(parsed.sections) ? parsed.sections : []
    // Clear previous sections
    await prisma.section.deleteMany({ where: { projectId } })
    // Insert
    if (sections.length) {
      await prisma.section.createMany({
        data: sections.map((s: any, i: number) => ({
          projectId,
          key: String(s.key || pack.sections[i]?.id || `sec_${i+1}`),
          title: String(s.title || pack.sections[i]?.title || `Section ${i+1}`),
          order: Number(s.order ?? i + 1),
          contentMd: String(s.contentMd || ''),
          slotsJson: s.slotsStatus || null,
        })),
      })
    } else {
      // Fallback minimal sections
      await prisma.section.createMany({
        data: pack.sections.slice(0,3).map((ps, i) => ({ projectId, key: ps.id, title: ps.title, order: i+1, contentMd: '[MISSING: All]' }))
      })
    }
    await prisma.project.update({ where: { id: projectId }, data: { name: parsed.title || project.name, status: 'drafting' } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
