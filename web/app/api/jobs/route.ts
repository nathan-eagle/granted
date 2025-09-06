import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { projectId, templateId, inputs } = await req.json()
  // @ts-ignore
  const userId = session.user.id as string
  const job = await prisma.job.create({ data: { userId, projectId, templateId, inputs } })

  // Trigger background generation
  const url = new URL(req.url)
  const base = `${url.protocol}//${url.host}`
  await fetch(`${base}/api/generate?jobId=${job.id}`, { method: 'POST', headers: { 'x-vercel-background': '1' } }).catch(() => {})

  return NextResponse.json({ jobId: job.id })
}

