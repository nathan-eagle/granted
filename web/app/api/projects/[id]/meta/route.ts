import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const meta = await prisma.projectMeta.findUnique({ where: { projectId: params.id } })
  if (meta) return NextResponse.json({ meta })
  const created = await prisma.projectMeta.create({ data: { projectId: params.id, status: "Draft" } })
  return NextResponse.json({ meta: created })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const data = await req.json()
  const meta = await prisma.projectMeta.upsert({
    where: { projectId: params.id },
    update: data,
    create: { projectId: params.id, status: data?.status || "Draft", ...data },
  })
  return NextResponse.json({ meta })
}
