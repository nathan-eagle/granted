import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const uploadId = String(body.uploadId || '')
    const kind = body.kind ? String(body.kind) : undefined
    const filename = body.filename ? String(body.filename) : undefined
    if (!uploadId || (!kind && !filename)) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    await prisma.upload.update({ where: { id: uploadId }, data: { ...(kind ? { kind } : {}), ...(filename ? { filename } : {}) } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 })
  }
}
