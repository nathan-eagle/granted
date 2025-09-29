import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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
  if (!projectId || !file) return NextResponse.json({ error: "projectId and file required" }, { status: 400 })

  const arrayBuffer = await file.arrayBuffer()
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
    data: { projectId, kind, filename: file.name, text }
  })

  return NextResponse.json({ upload })
}
