import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sections = await prisma.section.findMany({
    where: { projectId: params.id },
    orderBy: { order: "asc" },
  })
  return NextResponse.json({ sections })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { title } = await req.json()
  const maxOrder = await prisma.section.aggregate({
    where: { projectId: params.id },
    _max: { order: true },
  })
  const order = (maxOrder._max.order ?? -1) + 1
  const section = await prisma.section.create({
    data: {
      projectId: params.id,
      title: title || "Untitled section",
      order,
      key: `${Date.now()}`,
    },
  })
  return NextResponse.json({ section })
}
