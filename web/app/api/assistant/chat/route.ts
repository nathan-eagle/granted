import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { projectId, message } = await req.json()
    if (!projectId || !message) return NextResponse.json({ error: 'Missing projectId or message' }, { status: 400 })
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const meta: any = project.meta || {}
    const chat: any[] = Array.isArray(meta.chat) ? meta.chat : []
    chat.push({ role: 'user', content: String(message) })
    // Compose system prompt with context
    const system = 'You are an assistant helping write an SBIR/STTR grant. Answer succinctly and suggest next steps. '
    const charter = project.charterJson ?? {}
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
    const r = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: JSON.stringify({ CHARTER: charter, MSG: message }) },
      ],
      temperature: 0.2,
    })
    const reply = r.choices[0]?.message?.content || '👍'
    chat.push({ role: 'assistant', content: reply })
    await prisma.project.update({ where: { id: projectId }, data: { meta: { ...meta, chat } } })
    return NextResponse.json({ ok: true, reply })
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

