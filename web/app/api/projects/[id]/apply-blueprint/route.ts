import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { NSF_SBIR_PHASE_I } from "../../../../lib/blueprints/nsf_sbir"

const prisma = new PrismaClient()

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const projectId = params.id
  const payload = await req.json().catch(()=> ({}))
  const variables = (payload?.variables || {}) as Record<string, string>

  // Wipe existing sections
  await prisma.sectionSource.deleteMany({ where: { section: { projectId } } } as any)
  await prisma.section.deleteMany({ where: { projectId } })

  // Seed new sections
  for (let i = 0; i < NSF_SBIR_PHASE_I.sections.length; i++) {
    const s = NSF_SBIR_PHASE_I.sections[i]
    await prisma.section.create({
      data: {
        projectId,
        title: s.title,
        order: i,
        contentJson: { key: s.key, targetWords: s.targetWords, promptTemplate: s.promptTemplate, variables },
        contentHtml: "<p></p>",
        wordCount: 0,
      } as any
    })
  }

  return NextResponse.json({ ok: true, blueprint: NSF_SBIR_PHASE_I.slug, count: NSF_SBIR_PHASE_I.sections.length })
}
