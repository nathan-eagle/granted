import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function postJSON(path: string, body: any, timeoutMs = 30000) {
  const base = process.env.APP_URL || 'http://localhost:3000'
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal })
    if (!res.ok) throw new Error(`Failed ${path}: ${res.status}`)
    return await res.json().catch(() => ({}))
  } finally { clearTimeout(t) }
}

export async function POST(req: NextRequest) {
  try {
    const { projectId } = await req.json()
    if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })
    // Fire and forget run pipeline; client can subscribe to SSE overlay or poll /progress
    postJSON('/api/autopilot/run', { projectId }).catch(() => {})
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 })
  }
}

