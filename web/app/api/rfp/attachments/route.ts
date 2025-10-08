import { NextRequest, NextResponse } from "next/server"

export const runtime = "edge"
export const dynamic = "force-dynamic"

export async function POST(_req: NextRequest) {
  return NextResponse.json({
    note: "Attachments ingestion moved to AgentKit actions; use /api/intake/provide with file uploads.",
  })
}
