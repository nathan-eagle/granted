import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { loadPackForProject } from '@/lib/agencyPacks'
import { client, defaultModel } from '@/lib/ai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { projectId, message } = await req.json()
    if (!projectId || !message) return NextResponse.json({ error: 'Missing projectId or message' }, { status: 400 })

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    const pack = await loadPackForProject(project)
    const charter = project.charterJson ?? {}
    const facts: any[] = (project as any).factsJson || []

    const system = 'Be a concise, helpful grant-writing assistant. Use the project\'s CHARTER, AGENCY_PACK, and FACTS. Offer specific suggestions. When the user asks to add content, produce a short patch suitable for the current section.'
    const userPayload = { CHARTER: charter, AGENCY_PACK: pack, FACTS: facts, USER_MESSAGE: String(message) }
    const r = await client.chat.completions.create({
      model: defaultModel,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: JSON.stringify(userPayload) },
      ],
      temperature: 0.2,
    })
    const reply = r.choices?.[0]?.message?.content || ''

    const meta: any = (project as any).meta || {}
    const chat: { role: string; content: string }[] = Array.isArray(meta.chat) ? meta.chat : []
    chat.push({ role: 'user', content: String(message) })
    chat.push({ role: 'assistant', content: reply })
    await prisma.project.update({ where: { id: projectId }, data: { meta: { ...meta, chat } } })

    return NextResponse.json({ ok: true, reply })
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 })
  }
}
