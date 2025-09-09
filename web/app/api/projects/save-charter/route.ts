import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { projectId, charter } = await req.json()
    if (!projectId || typeof charter !== 'object') return NextResponse.json({ error: 'Missing projectId or charter' }, { status: 400 })
    await prisma.project.update({ where: { id: projectId }, data: { charterJson: charter } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 })
  }
}

