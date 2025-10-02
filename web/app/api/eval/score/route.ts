import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { fleschReadingEase, Scorecard } from "../../../../lib/eval/score"

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  const { projectId } = await req.json()
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 })
  const sections = await prisma.section.findMany({ where: { projectId }, orderBy: { order: "asc" } })
  const score: Scorecard = {
    projectId,
    totalWords: 0,
    sections: [],
    compliance: { sectionsWithContent: 0, sectionsTotal: sections.length }
  }
  for (const s of sections) {
    const html = s.contentHtml || ""
    const text = html.replace(/<[^>]+>/g, " ")
    const words = text.trim().split(/\s+/).filter(Boolean).length
    const fe = fleschReadingEase(text)
    score.totalWords += words
    score.sections.push({ sectionId: s.id, title: s.title, words, flesch: fe, withinLimit: s.wordCount ? (s.limitWords ? s.wordCount <= s.limitWords : undefined) : undefined } as any)
    if (words > 0) score.compliance.sectionsWithContent++
  }
  return NextResponse.json({ score })
}
