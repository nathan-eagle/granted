import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'

async function getProject(id: string, userId: string) {
  return prisma.project.findFirst({ where: { id, userId } })
}

async function getCategories() {
  return prisma.templateCategory.findMany({
    orderBy: { order: 'asc' },
    include: { templates: { orderBy: { order: 'asc' } } },
  })
}

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) notFound()
  // We no longer use the legacy project interface; send users to the draft workspace
  return redirect(`/project/${params.id}/draft`)
}

async function renameProject(projectId: string, formData: FormData) {
  'use server'
  const session = await getServerSession(authOptions)
  if (!session?.user) return
  const name = String(formData.get('name') || '').trim()
  if (!name) return
  // No UI here anymore; simply update and redirect to draft
  const { prisma } = await import('@/lib/prisma')
  await prisma.project.update({ where: { id: projectId }, data: { name } })
  redirect(`/project/${projectId}/draft`)
}

async function duplicateProject(projectId: string) {
  'use server'
  const session = await getServerSession(authOptions)
  if (!session?.user) return
  // @ts-ignore
  const userId = session.user.id as string
  const { prisma } = await import('@/lib/prisma')
  const src = await prisma.project.findFirst({ where: { id: projectId, userId }, include: { responses: true } })
  if (!src) return
  const copy = await prisma.project.create({ data: { userId, name: `Copy of ${src.name}` } })
  if (src.responses.length) {
    await prisma.response.createMany({
      data: src.responses.map(r => ({
        projectId: copy.id,
        templateId: r.templateId,
        inputs: r.inputs as any,
        output: r.output,
        model: r.model,
        tokenUsage: (r.tokenUsage as any) ?? undefined,
        docUrl: r.docUrl ?? undefined,
      })),
    })
  }
  redirect(`/project/${copy.id}/draft`)
}
