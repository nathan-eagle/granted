import { NextRequest, NextResponse } from "next/server"
import { mapRequirementsToBlueprint } from "@/lib/blueprints/mapper"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Payload = {
  projectId?: string
  rfpId?: string
  blueprintId?: string
}

async function readPayload(req: NextRequest): Promise<Payload> {
  try {
    const data = await req.json()
    if (data && typeof data === "object") {
      return data as Payload
    }
  } catch {
    // fall back to parsing form data
  }
  try {
    const form = await req.formData()
    const result: Payload = {}
    for (const [key, value] of form.entries()) {
      if (typeof value === "string") {
        ;(result as any)[key] = value
      }
    }
    return result
  } catch {
    return {}
  }
}

export async function POST(req: NextRequest) {
  const payload = await readPayload(req)
  const projectId = payload.projectId?.toString()
  const rfpId = payload.rfpId?.toString()
  const blueprintId = payload.blueprintId?.toString()

  if (!projectId || !rfpId || !blueprintId) {
    return NextResponse.json({ error: "projectId, rfpId, blueprintId required" }, { status: 400 })
  }

  try {
    const result = await mapRequirementsToBlueprint({ projectId, rfpId, blueprintId })
    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Blueprint mapping failed", error)
    return NextResponse.json({ error: error?.message || "server error" }, { status: 500 })
  }
}
