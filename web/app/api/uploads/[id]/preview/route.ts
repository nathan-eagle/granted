import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const upload = await prisma.upload.findUnique({ where: { id: params.id } })
  if (!upload) return NextResponse.json({ error: "not found" }, { status: 404 })

  try {
    if (upload.url && upload.filename?.endsWith(".docx")) {
      const res = await fetch(upload.url)
      const arrayBuffer = await res.arrayBuffer()
      const mammoth = await import("mammoth")
      const html = (await mammoth.convertToHtml({ arrayBuffer })).value
      return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } })
    }
  } catch (error) {
    console.error("Failed to render docx preview", error)
  }

  const fallback = (upload.text || "").replace(/[&<>]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[char] as string))
  const html = `<pre style="white-space:pre-wrap;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">${fallback}</pre>`
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } })
}
