import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

async function getGoogleAccessToken(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, provider: 'google' },
  })
  if (!account?.refresh_token) return null

  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    grant_type: 'refresh_token',
    refresh_token: account.refresh_token,
  })
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) return null
  const json = await res.json()
  return json.access_token as string
}

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // @ts-ignore
  const userId = session.user.id as string

  const { responseId } = await req.json()
  if (!responseId) return NextResponse.json({ error: 'Missing responseId' }, { status: 400 })

  const resp = await prisma.response.findUnique({
    where: { id: responseId },
    include: { project: true },
  })
  if (!resp) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (resp.project.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const accessToken = await getGoogleAccessToken(userId)
  if (!accessToken) {
    return NextResponse.json({ error: 'Google account not linked with offline access. Please sign out and sign in again to grant access.' }, { status: 400 })
  }

  // Create a Google Doc then insert text
  const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: `Granted - ${new Date().toLocaleString()}` }),
  })
  if (!createRes.ok) {
    const t = await createRes.text()
    return NextResponse.json({ error: 'Failed to create document', detail: t }, { status: 500 })
  }
  const doc = await createRes.json() as { documentId: string }

  const content = resp.output ?? ''
  const batch = await fetch(`https://docs.googleapis.com/v1/documents/${doc.documentId}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [{ insertText: { text: content, location: { index: 1 } } }] }),
  })
  if (!batch.ok) {
    const t = await batch.text()
    return NextResponse.json({ error: 'Failed to write document', detail: t }, { status: 500 })
  }

  const url = `https://docs.google.com/document/d/${doc.documentId}/edit`
  await prisma.response.update({ where: { id: responseId }, data: { docUrl: url } })
  return NextResponse.json({ url })
}

