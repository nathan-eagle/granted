import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })
  const p = await prisma.project.findUnique({ where: { id: projectId } })
  const meta: any = p?.meta || {}
  const progress: string[] = Array.isArray(meta.progress) ? meta.progress : []
  const done = progress.includes('done')
  return NextResponse.json({ progress, done })
}

