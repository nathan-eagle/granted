import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const projects = await prisma.project.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json({ projects })
}

export async function POST(req: NextRequest) {
  const { name } = await req.json()
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 })
  const project = await prisma.project.create({ data: { name, status: "drafting" } as any })
  return NextResponse.json({ project })
}
