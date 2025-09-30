import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { supabaseServer } from "@/lib/supabaseServer"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get("projectId")
  const kind = searchParams.get("kind") || undefined
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 })
  const uploads = await prisma.upload.findMany({ where: { projectId, ...(kind ? { kind } : {}) }, orderBy: { createdAt: "desc" } })
  return NextResponse.json({ uploads })
}

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const projectId = form.get("projectId")?.toString()
  const kind = (form.get("kind")?.toString() || "application")
  const file = form.get("file") as unknown as File
  if (!projectId || !file) {
    return NextResponse.json({ error: "projectId and file required" }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  const storagePath = `projects/${projectId}/${Date.now()}_${file.name}`

  const { error: uploadError } = await supabaseServer.storage
    .from("uploads")
    .upload(storagePath, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    })

  if (uploadError) {
    console.error("Supabase storage error", uploadError)
    return NextResponse.json({ error: "storage upload failed" }, { status: 500 })
  }

  const { data: publicUrlData } = supabaseServer.storage.from("uploads").getPublicUrl(storagePath)
  const fileUrl = publicUrlData?.publicUrl

  let text: string | undefined

  try {
    const extension = (file.name.split(".").pop() || "").toLowerCase()
    if (extension === "docx") {
      const mammothMod = await import("mammoth")
      const mammoth = (mammothMod as any).default ?? mammothMod
      const res = await mammoth.extractRawText({ arrayBuffer })
      text = res.value
    } else {
      text = await file.text()
    }
  } catch (error) {
    console.error("Failed to process upload", error)
    text = undefined
  }

  const upload = await prisma.upload.create({
    data: { projectId, kind, filename: file.name, text, url: fileUrl }
  })

  return NextResponse.json({ upload })
}
