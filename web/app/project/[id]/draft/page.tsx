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
        <div style={{marginTop:16}}>
          <div style={{fontWeight:600, marginBottom:4}}>Upload (.txt/.md)</div>
          <form action="/api/autopilot/upload" method="post" encType="multipart/form-data">
            <input type="hidden" name="projectId" value={project.id} />
            <input type="text" name="kind" placeholder="kind (e.g., boilerplate)" />
            <input type="file" name="file" accept=".txt,.md" />
            <button type="submit" style={{marginTop:6}}>Upload</button>
          </form>
          <form action={mineFacts.bind(null, project.id)} style={{marginTop:8}}>
            <button type="submit">Extract Facts</button>
          </form>
        </div>
        {project.meta && (project.meta as any).fixList ? (
          <div style={{marginTop:16}}>
            <div style={{fontWeight:600}}>Fix‑list</div>
            <ul>
              {((project.meta as any).fixList as any[]).slice(0,8).map((f,i) => (
                <li key={i}>
                  <form action={applyFix.bind(null, project.id)}>
                    <input type="hidden" name="sectionKey" value={String(f.sectionKey || '')} />
                    <input type="hidden" name="patch" value={String(f.patch || '')} />
                    <button type="submit">Apply</button> {f.sectionKey}: {f.label}
                  </form>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <form action={runMockReview.bind(null, project.id)} style={{marginTop:16}}>
            <button type="submit">Run Mock Review</button>
          </form>
        )}
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
            {/* Append each fact to this section, if available */}
            {(project.factsJson as any[])?.length ? (
              <details style={{marginTop:8}}>
                <summary>Add a fact to this section</summary>
                <ul>
                  {((project.factsJson as any[]) || []).slice(0,5).map((f:any,idx:number) => (
                    <li key={idx}>
                      <form action={appendFact.bind(null, s.id)}>
                        <input type="hidden" name="text" value={String(f.text||'')} />
                        <button type="submit">Append</button> {f.text}
                      </form>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
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

async function mineFacts(projectId: string) {
  'use server'
  await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/autopilot/mine-facts`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ projectId }) })
}

async function appendFact(sectionId: string, formData: FormData) {
  'use server'
  const text = String(formData.get('text') || '')
  await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/autopilot/append-fact`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ sectionId, text }) })
}

async function runMockReview(projectId: string) {
  'use server'
  await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/autopilot/mock-review`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ projectId }) })
}

async function applyFix(projectId: string, formData: FormData) {
  'use server'
  const sectionKey = String(formData.get('sectionKey') || '')
  const patch = String(formData.get('patch') || '')
  if (!patch || !sectionKey) return
  const section = await prisma.section.findFirst({ where: { projectId, key: sectionKey } })
  if (!section) return
  await prisma.section.update({ where: { id: section.id }, data: { contentMd: (section.contentMd || '') + '\n\n' + patch } })
}
