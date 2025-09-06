import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound } from 'next/navigation'

export default async function DraftPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) notFound()
  // @ts-ignore
  const userId = session.user.id as string
  const project = await prisma.project.findFirst({ where: { id: params.id, userId }, include: { sections: { orderBy: { order: 'asc' } } } })
  if (!project) notFound()
  return (
    <div style={{display:'grid',gridTemplateColumns:'260px 1fr',gap:24}}>
      <aside style={{borderRight:'1px solid #eee',paddingRight:16}}>
        <div style={{fontWeight:600}}>Outline</div>
        <ul>
          {project.sections.map(s => (
            <li key={s.id}>{s.title}</li>
          ))}
        </ul>
      </aside>
      <section>
        <h1>{project.name}</h1>
        {project.sections.map(s => (
          <div key={s.id} style={{margin:'16px 0'}}>
            <h2>{s.title}</h2>
            <textarea defaultValue={s.contentMd || ''} rows={10} style={{width:'100%'}} readOnly />
          </div>
        ))}
      </section>
    </div>
  )
}

