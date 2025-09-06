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
        <p>Select a template on the left to begin.</p>
      </section>
    </div>
  )
}

