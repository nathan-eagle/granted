import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getBaseUrl } from "@/lib/baseUrl"
import { uploadArtifact } from "@/lib/artifacts"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type StepResult = {
  name: string
  ok: boolean
  details?: unknown
  error?: string
}

type Payload = {
  keyword?: string
  projectName?: string
  simplerId?: string
  opportunityId?: string
  blueprintId?: string
}

async function readPayload(req: NextRequest): Promise<Payload> {
  try {
    const json = await req.json()
    if (json && typeof json === "object") {
      return json as Payload
    }
  } catch {
    // fall back to form data
  }

  try {
    const form = await req.formData()
    const result: Record<string, string> = {}
    for (const [key, value] of form.entries()) {
      if (typeof value === "string") {
        result[key] = value
      }
    }
    return result as Payload
  } catch {
    return {}
  }
}

async function postJSON(baseUrl: string, path: string, body: unknown) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  })

  if (!response.ok) {
    const message = await response.text().catch(() => "")
    throw new Error(`POST ${path} failed: ${response.status} ${message}`)
  }

  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export async function POST(req: NextRequest) {
  const steps: StepResult[] = []
  const baseUrl = getBaseUrl(req.headers)
  const {
    keyword = "NSF SBIR",
    projectName = "NSF SBIR Demo",
    simplerId,
    opportunityId,
    blueprintId = "nsf_sbir",
  } = await readPayload(req)

  let runRecord: { id: string } | null = null
  let projectId: string | null = null
  let rfpId: string | null = null
  let exportUrl: string | null = null
  let scorecard: unknown = null

  const recordStep = (step: StepResult) => {
    steps.push(step)
  }

  try {
    try {
      runRecord = await prisma.agentRun.create({
        data: { status: "running", steps: [] },
        select: { id: true },
      })
      recordStep({ name: "agentRun.create", ok: true, details: { runId: runRecord.id } })
    } catch (error: any) {
      recordStep({ name: "agentRun.create", ok: false, error: error?.message || String(error) })
    }

    let searchResult: any = null
    try {
      searchResult = await postJSON(baseUrl, "/api/rfp/search", { keyword, rows: 3 })
      const count = searchResult?.items?.length ?? searchResult?.results?.length ?? 0
      recordStep({ name: "rfp.search", ok: true, details: { count } })
    } catch (error: any) {
      recordStep({ name: "rfp.search", ok: false, error: error?.message || String(error) })
    }

    try {
      const firstHit = Array.isArray(searchResult?.items) ? searchResult.items[0] : null
      const payload = {
        metadata: {
          oppNum: opportunityId || firstHit?.opportunityNumber || "DEMO",
          title: firstHit?.title || projectName,
          agency: firstHit?.agency,
        },
        pdfUrl: firstHit?.pdfUrl || firstHit?.url || firstHit?.downloadUrl,
      }
      const ingest = await postJSON(baseUrl, "/api/rfp/ingest", payload)
      rfpId = ingest?.rfp?.id ?? ingest?.id ?? null
      recordStep({ name: "rfp.ingest", ok: true, details: { rfpId } })
    } catch (error: any) {
      recordStep({ name: "rfp.ingest", ok: false, error: error?.message || String(error) })
    }

    try {
      const project = await prisma.project.create({
        data: { name: projectName, status: "drafting" } as any,
      })
      projectId = project.id
      recordStep({ name: "project.create", ok: true, details: { projectId } })
      if (runRecord) {
        await prisma.agentRun.update({ where: { id: runRecord.id }, data: { projectId } })
      }
    } catch (error: any) {
      recordStep({ name: "project.create", ok: false, error: error?.message || String(error) })
    }

    try {
      if (projectId) {
        if (simplerId) {
          const attachments = await postJSON(baseUrl, "/api/rfp/attachments", {
            source: "simpler",
            simplerId,
            projectId,
          })
          const count = attachments?.count ?? attachments?.uploads?.length ?? 0
          recordStep({ name: "rfp.attachments.simpler", ok: true, details: { count } })
        } else if (opportunityId) {
          await postJSON(baseUrl, "/api/rfp/attachments", {
            source: "grants",
            opportunityId,
            projectId,
          })
          recordStep({ name: "rfp.attachments.grants", ok: true })
        } else {
          recordStep({ name: "rfp.attachments", ok: true, details: { skipped: true } })
        }
      }
    } catch (error: any) {
      recordStep({ name: "rfp.attachments", ok: false, error: error?.message || String(error) })
    }

    try {
      if (projectId) {
        await postJSON(baseUrl, `/api/projects/${projectId}/apply-blueprint`, { blueprintId })
        recordStep({ name: "blueprint.apply", ok: true })
      } else {
        recordStep({ name: "blueprint.apply", ok: false, error: "No project" })
      }
    } catch (error: any) {
      recordStep({ name: "blueprint.apply", ok: false, error: error?.message || String(error) })
    }

    try {
      if (projectId && rfpId) {
        const mapped = await postJSON(baseUrl, "/api/blueprints/map", { projectId, rfpId, blueprintId })
        const mappedCount = mapped?.count ?? mapped?.mapped ?? null
        recordStep({ name: "blueprint.map", ok: true, details: { count: mappedCount } })
      } else {
        recordStep({ name: "blueprint.map", ok: true, details: { skipped: true } })
      }
    } catch (error: any) {
      recordStep({ name: "blueprint.map", ok: false, error: error?.message || String(error) })
    }

    try {
      if (projectId) {
        await postJSON(baseUrl, `/api/projects/${projectId}/autopilot`, {})
        recordStep({ name: "autopilot", ok: true })
      } else {
        recordStep({ name: "autopilot", ok: false, error: "No project" })
      }
    } catch (error: any) {
      recordStep({ name: "autopilot", ok: false, error: error?.message || String(error) })
    }

    try {
      if (projectId) {
        const response = await fetch(`${baseUrl}/api/projects/${projectId}/export/docx`)
        if (!response.ok) throw new Error(`export failed ${response.status}`)
        const buffer = new Uint8Array(await response.arrayBuffer())
        exportUrl = runRecord
          ? await uploadArtifact(runRecord.id, "draft.docx", buffer, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
          : null
        recordStep({ name: "export.docx", ok: true, details: { artifact: Boolean(exportUrl) } })
      } else {
        recordStep({ name: "export.docx", ok: false, error: "No project" })
      }
    } catch (error: any) {
      recordStep({ name: "export.docx", ok: false, error: error?.message || String(error) })
    }

    try {
      if (projectId) {
        scorecard = await postJSON(baseUrl, "/api/eval/score", { projectId })
        if (runRecord && scorecard) {
          const encoded = new TextEncoder().encode(JSON.stringify(scorecard, null, 2))
          await uploadArtifact(runRecord.id, "scorecard.json", encoded, "application/json")
        }
        recordStep({ name: "eval.score", ok: true })
      } else {
        recordStep({ name: "eval.score", ok: false, error: "No project" })
      }
    } catch (error: any) {
      recordStep({ name: "eval.score", ok: false, error: error?.message || String(error) })
    }

    if (runRecord) {
      await prisma.agentRun.update({
        where: { id: runRecord.id },
        data: {
          status: "success",
          steps: steps as any,
          projectId,
          rfpId,
          docxUrl: exportUrl ?? undefined,
          scores: scorecard ? (scorecard as any) : undefined,
        },
      })
    }

    return NextResponse.json({
      ok: true,
      projectId,
      rfpId,
      runId: runRecord?.id ?? null,
      exportUrl,
      scorecard,
      steps,
    })
  } catch (error: any) {
    if (runRecord) {
      await prisma.agentRun.update({
        where: { id: runRecord.id },
        data: { status: "failed", steps: steps as any, projectId, rfpId },
      }).catch(() => undefined)
    }
    return NextResponse.json(
      { ok: false, error: error?.message || String(error), steps },
      { status: 500 }
    )
  }
}
