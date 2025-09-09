import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest){
  try{
    const { projectId, charter } = await req.json()
    if (!projectId || !charter) return NextResponse.json({ error:'Missing fields' }, { status:400 })
    await prisma.project.update({ where: { id: projectId }, data: { charterJson: charter } })
    return NextResponse.json({ ok:true })
  } catch(e:any){
    return NextResponse.json({ error: String(e) }, { status:500 })
  }
}

