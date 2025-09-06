import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'

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
        <div style={{marginTop:12}}>
          <form action={recomputeCoverage.bind(null, project.id)}>
            <button type="submit">Recompute Coverage</button>
          </form>
          <div style={{marginTop:8}}>
            <Link href={`/projects/${project.id}`}>Back to Project</Link>
          </div>
        </div>
      </aside>
      <section>
        <h1>{project.name}</h1>
        <div style={{display:'flex',gap:8,margin:'8px 0 16px'}}>
          <form action={runAutodraft.bind(null, project.id)}>
            <button type="submit">Regenerate Draft</button>
          </form>
          <form action={exportDocx.bind(null, project.id)}>
            <button type="submit">Export DOCX</button>
          </form>
        </div>
        {project.sections.map(s => (
          <div key={s.id} style={{margin:'16px 0'}}>
            <h2>{s.title}</h2>
            <textarea defaultValue={s.contentMd || ''} rows={10} style={{width:'100%'}} readOnly />
            <div style={{marginTop:8,display:'flex',gap:8}}>
              <form action={fixNext.bind(null, s.id)}><button type="submit">Fix next</button></form>
              <form action={tighten.bind(null, s.id)}><button type="submit">Tighten to limit</button></form>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}

async function runAutodraft(projectId: string) {
  'use server'
  await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/autopilot/autodraft`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ projectId }) })
}

async function recomputeCoverage(projectId: string) {
  'use server'
  await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/autopilot/coverage`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ projectId }) })
}

async function fixNext(sectionId: string) {
  'use server'
  await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/autopilot/fill-gap`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ sectionId }) })
}

async function tighten(sectionId: string) {
  'use server'
  await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/autopilot/tighten`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ sectionId }) })
}

async function exportDocx(projectId: string) {
  'use server'
  // Fire and forget; client can download from returned route if needed in future
  await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/export/docx?projectId=${projectId}`)
}
