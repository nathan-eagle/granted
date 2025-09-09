import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function hashId(s: string){
  let h = 0; for (let i = 0; i < Math.min(200, s.length); i++){ h = (h*31 + s.charCodeAt(i)) >>> 0 }
  return 'f' + h.toString(36)
}

export async function POST(req: NextRequest){
  try{
    const { sectionId, text, uploadId } = await req.json()
    if (!sectionId || !text) return NextResponse.json({ error:'Missing fields' }, { status:400 })
    const section = await prisma.section.findUnique({ where: { id: sectionId } })
    if (!section) return NextResponse.json({ error:'Section not found' }, { status:404 })
    const project = await prisma.project.findUnique({ where: { id: section.projectId } })
    if (!project) return NextResponse.json({ error:'Project not found' }, { status:404 })
    const id = hashId(String(text))
    const facts: any[] = Array.isArray((project as any).factsJson) ? ((project as any).factsJson as any[]) : []
    if (!facts.find(f => String(f.id||'') === id)){
      const f:any = { id, text: String(text), kind: 'snippet' }
      if (uploadId) f.evidence = { uploadId, quote: text }
      facts.push(f)
      await prisma.project.update({ where: { id: project.id }, data: { factsJson: facts } })
    }
    const updated = (section.contentMd || '') + '\n\n' + String(text) + ` {{fact:${id}}}`
    await prisma.section.update({ where: { id: sectionId }, data: { contentMd: updated } })
    return NextResponse.json({ ok:true, factId: id })
  } catch(e:any){
    return NextResponse.json({ error: String(e) }, { status:500 })
  }
}

