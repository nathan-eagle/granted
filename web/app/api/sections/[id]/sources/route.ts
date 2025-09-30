import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const items = await prisma.sectionSource.findMany({
    where: { sectionId: params.id },
  })
  return NextResponse.json({ uploadIds: items.map((item) => item.uploadId) })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { uploadIds } = await req.json()
  if (!Array.isArray(uploadIds)) {
    return NextResponse.json({ error: "uploadIds array required" }, { status: 400 })
  }

  await prisma.sectionSource.deleteMany({ where: { sectionId: params.id } })
  if (uploadIds.length) {
    await prisma.sectionSource.createMany({
      data: uploadIds.map((uploadId: string) => ({ sectionId: params.id, uploadId })),
      skipDuplicates: true,
    })
  }

  return NextResponse.json({ ok: true })
}
