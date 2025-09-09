import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest){
  try{
    const { projectId } = await req.json()
    if (!projectId) return NextResponse.json({ error:'Missing projectId' }, { status:400 })
    const p = await prisma.project.findUnique({ where: { id: projectId } })
    if (!p) return NextResponse.json({ error:'Not found' }, { status:404 })
    const meta: any = p.meta || {}
    meta.deletedAt = new Date().toISOString()
    await prisma.project.update({ where: { id: projectId }, data: { meta } })
    return NextResponse.json({ ok:true })
  } catch(e:any){
    return NextResponse.json({ error:String(e) }, { status:500 })
  }
}

