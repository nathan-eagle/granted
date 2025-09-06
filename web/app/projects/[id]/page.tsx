import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'

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
  // @ts-ignore
  const userId = session.user.id as string
  const project = await getProject(params.id, userId)
  if (!project) notFound()

  const cats = await getCategories()
  return (
    <div style={{display:'grid', gridTemplateColumns:'260px 1fr', gap:24}}>
      <aside style={{borderRight:'1px solid #eee', paddingRight:16}}>
        <div style={{fontWeight:600, marginBottom:8}}>Writing Models</div>
        {cats.map(c => (
          <div key={c.id} style={{marginBottom:12}}>
            <div style={{fontWeight:600}}>{c.name}</div>
            <ul>
              {c.templates.map(t => (
                <li key={t.id}>
                  <Link href={`/projects/${project.id}/${t.slug}`}>{t.emoji ?? ''} {t.title}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </aside>
      <section>
        <h1>{project.name}</h1>
        <div style={{display:'flex', gap:8, margin:'8px 0 16px'}}>
          <form action={renameProject.bind(null, project.id)}>
            <input type="text" name="name" placeholder="Rename project" />
            <button type="submit" style={{marginLeft:8}}>Rename</button>
          </form>
          <form action={duplicateProject.bind(null, project.id)}>
            <button type="submit">Duplicate Project</button>
          </form>
        </div>
        <p>Select a template on the left to begin.</p>
      </section>
    </div>
  )
}

import { redirect } from 'next/navigation'
async function renameProject(projectId: string, formData: FormData) {
  'use server'
  const session = await getServerSession(authOptions)
  if (!session?.user) return
  const name = String(formData.get('name') || '').trim()
  if (!name) return
  await prisma.project.update({ where: { id: projectId }, data: { name } })
  redirect(`/projects/${projectId}`)
}

async function duplicateProject(projectId: string) {
  'use server'
  const session = await getServerSession(authOptions)
  if (!session?.user) return
  // @ts-ignore
  const userId = session.user.id as string
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
  redirect(`/projects/${copy.id}`)
}
