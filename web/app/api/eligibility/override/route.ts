import { NextRequest, NextResponse } from "next/server"

import { withApiInstrumentation } from "@/lib/api/middleware"
import { overrideEligibilityItem } from "@/lib/agent/eligibility"

export const runtime = "nodejs"

export const POST = withApiInstrumentation(async (request: NextRequest) => {
  const body = await request.json().catch(() => ({}))
  const projectId: string | undefined = body?.projectId
  const eligibilityId: string | undefined = body?.eligibilityId
  const fatal: boolean | undefined = body?.fatal
  const note: string | undefined = body?.note

  if (!projectId || !eligibilityId || typeof fatal !== "boolean") {
    return NextResponse.json({ error: "projectId, eligibilityId, and fatal flag are required" }, { status: 400 })
  }

  const items = await overrideEligibilityItem(projectId, eligibilityId, { fatal, note })
  return NextResponse.json({ items })
})
