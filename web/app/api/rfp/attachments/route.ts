import { NextRequest, NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import { prisma } from "@/lib/prisma"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import { fetchOpportunity } from "@/lib/rfp/grantsApi"
import { getOpportunityDetail } from "@/lib/rfp/simplerApi"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_")
}

function requireSupabase(): SupabaseClient {
  const client = createSupabaseServerClient()
  if (!client) {
    throw new Error("Supabase service role credentials are not configured")
  }
  return client
}

async function saveToStorage(supabase: SupabaseClient, bytes: Uint8Array, path: string, contentType: string) {
  const { error } = await supabase.storage.from("uploads").upload(path, bytes, {
    contentType,
    upsert: true
  })
  if (error) {
    throw error
  }
  const { data } = supabase.storage.from("uploads").getPublicUrl(path)
  return data?.publicUrl ?? null
}

async function tryExtractText(filename: string, bytes: Uint8Array) {
  const lower = filename.toLowerCase()
  try {
    if (lower.endsWith(".pdf")) {
      const pdfModule = await import("pdf-parse")
      const pdf = (pdfModule as any).default ?? pdfModule
      const buffer = Buffer.from(bytes)
      const parsed = await pdf(buffer)
      return parsed.text
    }
    if (lower.endsWith(".docx")) {
      const mammoth = await import("mammoth")
      const result = await (mammoth as any).extractRawText({ arrayBuffer: bytes.buffer })
      return result.value
    }
  } catch (error) {
    console.warn("Attachment text extraction failed", error)
  }
  return undefined
}

export async function POST(req: NextRequest) {
  try {
    const body = await req
      .json()
      .catch(async () => {
        try {
          const form = await req.formData()
          const result: Record<string, string> = {}
          for (const [key, value] of form.entries()) {
            if (typeof value === "string") {
              result[key] = value
            }
          }
          return result
        } catch {
          return {}
        }
      })
    const { projectId, source, opportunityId, simplerId } = body as Record<string, string>

    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 })
    }

    if (source === "simpler" && simplerId) {
      const detail = await getOpportunityDetail(simplerId)
      const supabase = requireSupabase()
      const payload = (detail?.data ?? detail) as Record<string, any>
      const attachments: any[] = Array.isArray(payload?.attachments) ? payload.attachments : []
      const opportunityNumber = payload?.opportunity_number || simplerId
      const uploads: any[] = []

      for (const attachment of attachments) {
        const url = attachment?.url || attachment?.attachment_url || attachment?.link
        if (!url) continue
        const response = await fetch(url)
        if (!response.ok) continue
        const bytes = new Uint8Array(await response.arrayBuffer())
        const inferredMime = response.headers.get("content-type") || attachment?.mime_type || attachment?.content_type || "application/octet-stream"
        const filename = sanitizeFilename(String(attachment?.file_name || attachment?.filename || attachment?.name || "attachment"))
        const storagePath = `rfp/${opportunityNumber}/${Date.now()}_${filename}`
        const publicUrl = await saveToStorage(supabase, bytes, storagePath, inferredMime)
        const text = await tryExtractText(filename, bytes)
        const upload = await prisma.upload.create({
          data: {
            projectId,
            kind: "rfp-attachment",
            filename,
            url: publicUrl ?? url,
            text
          }
        })
        uploads.push(upload)
      }

      return NextResponse.json({ source: "simpler", count: uploads.length, uploads })
    }

    if (source === "grants" && opportunityId) {
      const data = await fetchOpportunity(Number(opportunityId))
      const folders = Array.isArray(data?.synopsisAttachmentFolders) ? data.synopsisAttachmentFolders : []
      const attachments = folders.flatMap((folder: any) =>
        Array.isArray(folder?.synopsisAttachments)
          ? folder.synopsisAttachments.map((item: any) => ({ folder: folder?.folderName, ...item }))
          : []
      )
      return NextResponse.json({
        source: "grants",
        attachments,
        note: "Grants.gov metadata does not contain direct download URLs; use the Simpler API when available."
      })
    }

    return NextResponse.json({ error: "Provide {source:'simpler', simplerId} or {source:'grants', opportunityId}" }, { status: 400 })
  } catch (error: any) {
    console.error("RFP attachments fetch failed", error)
    return NextResponse.json({ error: error?.message || "server error" }, { status: 500 })
  }
}
