import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const section = await prisma.section.findUnique({
    where: { id: params.id },
    include: { sources: true },
  })
  return NextResponse.json({ section })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { title, order, contentJson, contentHtml, wordCount, limitWords } = await req.json()
  const section = await prisma.section.update({
    where: { id: params.id },
    data: {
      ...(title === undefined ? {} : { title }),
      ...(order === undefined ? {} : { order }),
      ...(contentJson === undefined ? {} : { contentJson }),
      ...(contentHtml === undefined ? {} : { contentHtml }),
      ...(wordCount === undefined ? {} : { wordCount }),
      ...(limitWords === undefined ? {} : { limitWords }),
    },
  })
  return NextResponse.json({ section })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.section.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
