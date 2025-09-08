import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const uploadId = String(body.uploadId || '')
    const kind = String(body.kind || '')
    if (!uploadId || !kind) return NextResponse.json({ error: 'Missing uploadId or kind' }, { status: 400 })
    await prisma.upload.update({ where: { id: uploadId }, data: { kind } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 })
  }
}

