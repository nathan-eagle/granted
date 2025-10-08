import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { client } from "@/lib/ai"
import { registerKnowledgeBaseFile } from "@/lib/agent/knowledgeBase"
import { updateAgentSession, type AgentSessionMessage } from "@/lib/agent/sessions"
import { extractText } from "@/lib/agent/runtime"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const MAX_UPLOAD_BYTES = 40 * 1024 * 1024

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const projectId = String(form.get("projectId") || "").trim()
  const explicitKind = String(form.get("kind") || "").trim().toLowerCase()
  const sessionId = String(form.get("sessionId") || "").trim() || null
  const fileEntries = (form.getAll("file") as File[]).filter(Boolean)
  const urlEntries = form.getAll("url").map(value => String(value || "").trim()).filter(Boolean)

  if (!projectId || (fileEntries.length === 0 && urlEntries.length === 0)) {
    return NextResponse.json({ error: "Missing projectId or payload" }, { status: 400 })
  }

  const results: Array<{ uploadId: string; filename: string; kind: string; confidence: number; parsedChars: number; openAiFileId?: string | null }> = []

  for (const file of fileEntries) {
    const sizeMB = (file.size || 0) / (1024 * 1024)
    if (sizeMB > MAX_UPLOAD_BYTES / (1024 * 1024)) {
      return NextResponse.json({ error: "File too large (max 40MB)" }, { status: 413 })
    }
    const buffer = Buffer.from(await file.arrayBuffer())
    const name = file.name || "upload"
    const ingested = await ingestBuffer({ buffer, filename: name, explicitKind, projectId })
    results.push(ingested)
  }

  for (const url of urlEntries) {
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Failed to fetch ${url} (${response.status})`)
      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const filename = url.split("/").pop() || "remote_document"
      const ingested = await ingestBuffer({ buffer, filename, explicitKind, projectId, sourceUrl: url })
      results.push(ingested)
    } catch (error) {
      console.warn("[autopilot/upload] url ingest failed", { url, error })
    }
  }

  if (sessionId && results.length) {
    await appendIngestionEvent(sessionId, results)
  }

  return NextResponse.json({ ok: true, results })
}

type IngestArgs = {
  buffer: Buffer
  filename: string
  explicitKind: string
  projectId: string
  sourceUrl?: string
}

type IngestResult = {
  uploadId: string
  filename: string
  kind: string
  confidence: number
  parsedChars: number
  openAiFileId?: string | null
}

async function ingestBuffer({ buffer, filename, explicitKind, projectId, sourceUrl }: IngestArgs): Promise<IngestResult> {
  const openAiFile = await uploadToOpenAI(buffer, filename)
  const parsedText = await parseFileText(openAiFile.id, buffer)
  const kind = classifyUpload(explicitKind, filename, parsedText)
  const confidence = kind === "other" ? 0.5 : 0.9

  const created = await prisma.upload.create({
    data: {
      projectId,
      kind,
      kindDetail: kind === explicitKind ? null : explicitKind || undefined,
      filename,
      url: sourceUrl ?? null,
      openAiFileId: openAiFile.id,
      text: parsedText,
    },
  })

  await registerKnowledgeBaseFile({
    projectId,
    uploadId: created.id,
    filename,
    text: parsedText,
    source: sourceUrl ? "url" : "file",
    version: null,
    releaseDate: null,
  })

  return {
    uploadId: created.id,
    filename,
    kind,
    confidence,
    parsedChars: parsedText.length,
    openAiFileId: openAiFile.id,
  }
}

async function uploadToOpenAI(buffer: Buffer, filename: string) {
  const fileUpload = await client.files.create({
    file: { name: filename, data: buffer } as any,
    purpose: "assistants",
  })
  return fileUpload
}

async function parseFileText(fileId: string, fallbackBuffer: Buffer) {
  const responsesClient: any = (client as any).responses
  if (responsesClient?.parse) {
    try {
      const response = await responsesClient.parse({
        model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_file",
                file_id: fileId,
              },
            ],
          },
        ],
      })
      const text = extractText(response)
      if (text) return text
    } catch (error) {
      console.warn("[autopilot/upload] parse via responses.parse failed", error)
    }
  }

  if ((client as any).files?.content) {
    try {
      const contentResponse = await (client as any).files.content(fileId)
      const arrayBuffer = await contentResponse.arrayBuffer()
      return Buffer.from(arrayBuffer).toString("utf8")
    } catch (error) {
      console.warn("[autopilot/upload] files.content fallback failed", error)
    }
  }

  return fallbackBuffer.toString("base64").slice(0, 8000)
}

function classifyUpload(explicitKind: string, filename: string, body: string) {
  if (explicitKind) return explicitKind
  const fn = filename.toLowerCase()
  const t = (body || "").toLowerCase()
  if (/rfp|solicitation|request\s+for\s+proposals|funding\s+opportunity/.test(fn) || /request\s+for\s+proposals|funding\s+opportunity|nsf\s+sbir|nih\s+sbir/.test(t)) return "rfp"
  if (/prior|overview|proposal/.test(fn)) return "prior_proposal"
  if (/cv|resume|biosketch/.test(fn)) return "cv"
  if (/budget|cost/.test(fn)) return "budget"
  if (/facilit(y|ies)|equipment/.test(fn)) return "facilities"
  if (/boiler/.test(fn)) return "boilerplate"
  return "other"
}

async function appendIngestionEvent(sessionId: string, results: IngestResult[]) {
  const content = results
    .map(result => `Ingested ${result.filename} (${result.kind}) → upload ${result.uploadId}`)
    .join("\n")
  const messages: AgentSessionMessage[] = [
    {
      role: "tool",
      content,
      at: new Date().toISOString(),
    },
  ]
  try {
    await updateAgentSession(sessionId, { appendTranscript: messages })
  } catch (error) {
    console.warn("[autopilot/upload] failed to append session event", error)
  }
}
