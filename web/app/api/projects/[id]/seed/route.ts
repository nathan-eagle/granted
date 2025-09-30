import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getModel } from "@/lib/models"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const projectId = params.id
  const { modelSlug } = await req.json()
  const model = getModel(modelSlug)

  if (!model) {
    return NextResponse.json({ error: "model not found" }, { status: 400 })
  }

  await prisma.section.deleteMany({ where: { projectId } })

  let order = 0
  for (const section of model.sections) {
    await prisma.section.create({
      data: {
        projectId,
        key: section.key || `${model.slug}-${order}`,
        title: section.title,
        order: order++,
        contentJson: section as any,
      },
    })
  }

  return NextResponse.json({ ok: true, count: model.sections.length })
}
