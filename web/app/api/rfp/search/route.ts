import { NextRequest, NextResponse } from "next/server"
import { searchOpportunities } from "../../../../lib/rfp/grantsApi"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(()=> ({}))
  const json = await searchOpportunities(body || {})
  return NextResponse.json(json)
}
