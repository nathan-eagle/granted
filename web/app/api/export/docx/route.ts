import { NextRequest, NextResponse } from "next/server"

import { withApiInstrumentation } from "@/lib/api/middleware"
import { callAgentActionWithAgents } from "@/lib/agent/runner"
import type { AgentActionInput } from "@/lib/agent/agentkit"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function fetchFile(url: string) {
  if (url.startsWith("data:")) {
    const comma = url.indexOf(",")
    const meta = url.slice(5, comma)
    const data = url.slice(comma + 1)
    const buffer = Buffer.from(data, meta.includes(";base64") ? "base64" : "utf8")
    return { buffer, contentType: meta.split(";")[0] || "application/octet-stream" }
  }

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download exported file (${response.status})`)
  }
  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const contentType = response.headers.get("content-type") ?? "application/octet-stream"
  return { buffer, contentType }
}

export const GET = withApiInstrumentation(async (request: NextRequest) => {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get("projectId")
  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 })
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { name: true },
  })
  const downloadStem = (project?.name || projectId)
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
  const filename = `${downloadStem || projectId}.docx`

  const payload = await callAgentActionWithAgents("export_docx", {
    projectId,
  } as AgentActionInput<"export_docx">)

  if (!payload?.fileUrl) {
    return NextResponse.json({ error: "AgentKit export returned no file URL" }, { status: 502 })
  }

  const { buffer, contentType } = await fetchFile(payload.fileUrl)
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
})
