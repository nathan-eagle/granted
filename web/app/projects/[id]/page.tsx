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
        
        <div style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f0f9ff', borderRadius: '0.5rem', border: '1px solid #0ea5e9' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: '#0c4a6e' }}>
            🚀 New: Complete Grant Writing Assistant
          </h3>
          <p style={{ color: '#0369a1', marginBottom: '1rem' }}>
            Create comprehensive grant applications with our guided wizard, AI-powered section writing, and mock review system.
          </p>
          <a 
            href={`/projects/${project.id}/grants`}
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#0ea5e9',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '0.5rem',
              fontWeight: '600',
              fontSize: '0.875rem'
            }}
          >
            Manage Grant Applications
          </a>
        </div>
        
        <p>Select a template on the left for individual grant sections, or use the complete grant assistant above.</p>
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
