import { NextRequest, NextResponse } from "next/server"
import { agentRun } from "../../../../lib/agent/run"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(()=>({}))
  const r = await agentRun(body || {})
  return NextResponse.json({ ok: true, runId: r.id })
}
