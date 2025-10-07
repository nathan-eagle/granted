import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { client, defaultModel } from '@/lib/ai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function fetchUrlText(url: string): Promise<{ text: string; contentType: string | null }> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('pdf')) {
    return { text: '[PDF content omitted in build]', contentType: ct }
  }
  const html = await res.text()
  // naive strip tags
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')
  return { text, contentType: ct }
}

export async function POST(req: NextRequest) {
  const { projectId, url, source } = await req.json()
  if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })
  const project = await prisma.project.findUnique({ where: { id: projectId }, include: { uploads: true } })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let rfpText = ''
  if (url) {
    try { const got = await fetchUrlText(String(url)); rfpText = got.text.slice(0, 60000) } catch (e: any) { return NextResponse.json({ error: String(e) }, { status: 400 }) }
  } else if (source === 'upload') {
    const rfpUpload = (project.uploads || []).find(u => (u.kind || '').toLowerCase() === 'rfp') || project.uploads[0]
    rfpText = String(rfpUpload?.text || '').slice(0, 60000)
  } else {
    return NextResponse.json({ error: 'Provide url or source="upload" with an uploaded RFP' }, { status: 400 })
  }

  const system = `From this RFP text, synthesize an agency pack. Return ONLY JSON with keys:\n{
    "id": "auto_<hash>",
    "name": string,
    "sections": [{"id":string,"title":string,"limitWords":number,"mustCover":string[]}...],
    "rubric": [{"id":string,"name":string,"weight":number}...],
    "attachments": [{"name":string,"required":boolean}...]
  }\nPrefer clear, generic section names if not specified by the RFP.`
  const user = { RFP_TEXT: rfpText }
  const resp = await client.chat.completions.create({ model: defaultModel, messages: [ { role: 'system', content: system }, { role: 'user', content: JSON.stringify(user) } ], temperature: 0 })
  let pack: any
  try { pack = JSON.parse(resp.choices[0]?.message?.content || '{}') } catch { pack = {} }
  if (!pack || !pack.sections) return NextResponse.json({ error: 'Failed to generate pack' }, { status: 500 })

  const meta: any = project.meta || {}
  meta.autoPack = pack
  await prisma.project.update({ where: { id: projectId }, data: { meta, agencyPackId: 'auto' } })
  return NextResponse.json({ ok: true, packId: pack.id || 'auto' })
}
