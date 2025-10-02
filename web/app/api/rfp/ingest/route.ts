import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { naiveRequirementExtraction } from "../../../../lib/rfp/parser"

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  const { metadata, pdfUrl } = await req.json()
  if (!pdfUrl) return NextResponse.json({ error: "pdfUrl required" }, { status: 400 })

  // fetch PDF and extract naive requirements
  const buf = await fetch(pdfUrl).then(r => r.arrayBuffer())
  const text = "" // We keep text optional for now; heavy PDF parsing can be added if desired
  // naiveRequirementExtraction expects text; so try a fallback:
  let reqs: any[] = []
  try {
    // lazy import parser to avoid cold start cost
    const mod = await import("../../../../lib/rfp/parser")
    const extractedText = await mod.extractTextFromPdf(buf)
    reqs = mod.naiveRequirementExtraction(extractedText)
  } catch(e) {
    console.error("PDF parse failed", e)
  }

  const rfp = await prisma.rFP.create({
    data: {
      source: "grants.gov",
      oppNumber: metadata?.oppNum || metadata?.number || null,
      title: metadata?.title || null,
      agency: metadata?.agencyName || metadata?.agency || null,
      postedDate: metadata?.openDate ? new Date(metadata.openDate) : null,
      closeDate: metadata?.closeDate ? new Date(metadata.closeDate) : null,
      synopsis: metadata?.synopsis || null,
      raw: metadata || {},
      attachments: [{ pdfUrl }]
    }
  })

  for (const r of reqs) {
    await prisma.requirement.create({ data: { rfpId: rfp.id, key: r.key, title: r.title, instructions: r.instructions, targetWords: r.targetWords || null } })
  }

  return NextResponse.json({ rfp, requirements: reqs })
}
