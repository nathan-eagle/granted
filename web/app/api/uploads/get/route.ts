import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest){
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const limit = Number(searchParams.get('limit') || 8000)
  if (!id) return NextResponse.json({ error:'Missing id' }, { status:400 })
  const u = await prisma.upload.findUnique({ where: { id } })
  if (!u) return NextResponse.json({ error:'Not found' }, { status:404 })
  const text = String(u.text || '')
  return NextResponse.json({ ok:true, id, filename: u.filename, text: text.slice(0, Math.max(0, limit)) })
}

