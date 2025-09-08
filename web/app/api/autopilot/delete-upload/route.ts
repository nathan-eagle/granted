import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const uploadId = String(body.uploadId || '')
    if (!uploadId) return NextResponse.json({ error: 'Missing uploadId' }, { status: 400 })
    await prisma.upload.delete({ where: { id: uploadId } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 })
  }
}

