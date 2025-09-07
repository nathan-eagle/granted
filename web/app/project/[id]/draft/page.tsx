import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import FactsList from '@/components/FactsList'
import TopFixes from '@/components/TopFixes'
import RunAutopilotClient from '@/components/RunAutopilotClient'

export default async function DraftPage({ params, searchParams }: { params: { id: string }, searchParams: { [k:string]: string | string[] | undefined } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) notFound()
  // @ts-ignore
  const userId = session.user.id as string
  const project = await prisma.project.findFirst({ where: { id: params.id, userId }, include: { sections: { orderBy: { order: 'asc' } }, uploads: true } })
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
            <form action={applyAllSafeFixes.bind(null, project.id)}>
              <button type="submit">Apply all safe fixes</button>
            </form>
          </div>
        ) : (
          <form action={runMockReview.bind(null, project.id)} style={{marginTop:16}}>
            <button type="submit">Run Mock Review</button>
          </form>
        )}
      </aside>
      <section>
        <h1>{project.name}</h1>
        {/* Top fixes panel */}
        { (project.meta as any)?.fixList?.length ? <TopFixes projectId={project.id} fixes={(project.meta as any).fixList} /> : null }
        <div style={{display:'flex',gap:8,margin:'8px 0 16px'}}>
          <form action={runAutodraft.bind(null, project.id)}>
            <button type="submit">Regenerate Draft</button>
          </form>
          <form action={exportDocx.bind(null, project.id)}>
            <button type="submit">Export DOCX</button>
          </form>
          {/* Magic overlay trigger */}
          {/* Client trigger */}
          <RunAutopilotClient projectId={project.id} auto={searchParams?.run === '1'} />
        </div>
        <details style={{marginBottom:16}}>
          <summary>Budget (simple)</summary>
          <form action={addBudgetItem.bind(null, project.id)} style={{display:'flex',gap:6,marginTop:8}}>
            <input name="category" placeholder="Category" />
            <input name="amount" placeholder="Amount" />
            <input name="note" placeholder="Note" />
            <button type="submit">Add</button>
          </form>
          <div style={{marginTop:8}}>
            {(project.meta as any)?.budget?.items?.length ? (
              <table>
                <thead><tr><th>Category</th><th>Amount</th><th>Note</th><th></th></tr></thead>
                <tbody>
                  {((project.meta as any).budget.items as any[]).map((it:any, idx:number) => (
                    <tr key={it.id || idx}>
                      <td>{it.category}</td>
                      <td>{it.amount}</td>
                      <td>{it.note}</td>
                      <td>
                        <form action={removeBudgetItem.bind(null, project.id)}>
                          <input type="hidden" name="id" value={String(it.id || idx)} />
                          <button type="submit">Remove</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div>No items yet.</div>}
          </div>
        </details>
        {project.sections.map(s => (
          <div key={s.id} style={{margin:'16px 0'}}>
            <h2>{s.title}</h2>
            <form action={saveSection.bind(null, s.id)}>
              <textarea name="content" defaultValue={s.contentMd || ''} rows={12} style={{width:'100%'}} />
              <div style={{marginTop:6}}>
                <button type="submit">Save</button>
              </div>
            </form>
            {/* Inline source bubbles (list) when {{fact:ID}} markers are present */}
            {renderSources((project.factsJson as any[]) || [], project.uploads || [], s.contentMd || '')}
            <div style={{marginTop:8,display:'flex',gap:8}}>
              <form action={fixNext.bind(null, s.id)}><button type="submit">Fix next</button></form>
              <form action={tighten.bind(null, s.id)}><button type="submit">Tighten to limit</button></form>
            </div>
            {/* Append each fact to this section, if available */}
            {(project.factsJson as any[])?.length ? (
              <details style={{marginTop:8}}>
                <summary>Add a fact to this section</summary>
                <FactsList facts={(((project.factsJson as any[]) || []).map((f:any) => ({
                  ...f,
                  evidence: f.evidence ? {
                    ...f.evidence,
                    filename: project.uploads.find(u => u.id === f.evidence.uploadId)?.filename
                  } : undefined
                })))} sectionId={s.id} />
              </details>
            ) : null}
          </div>
        ))}
      </section>
    </div>
  )
}

function renderSources(facts: any[], uploads: { id: string; filename: string }[], md: string){
  const m = Array.from(md.matchAll(/\{\{fact:([^}]+)\}\}/g)).map(x => String(x[1]))
  if (!m.length) return null
  const byId = new Map(facts.map(f => [String(f.id || ''), f]))
  const unique = Array.from(new Set(m))
  const items = unique.map(id => {
    const f = byId.get(id)
    const fn = f?.evidence?.uploadId ? (uploads.find(u => u.id === f.evidence.uploadId)?.filename || '') : ''
    return { id, text: f?.text || '', filename: fn }
  }).filter(it => it.text)
  if (!items.length) return null
  return (
    <div style={{marginTop:6, fontSize:12, color:'#9CA3AF'}}>
      Sources used: {items.map((it, i) => (
        <span key={it.id} style={{marginRight:8}}>
          ({it.filename ? `Source: ${it.filename}` : `Fact ${it.id}`})
        </span>
      ))}
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

async function saveSection(sectionId: string, formData: FormData) {
  'use server'
  const content = String(formData.get('content') || '')
  await prisma.section.update({ where: { id: sectionId }, data: { contentMd: content } })
}

async function addBudgetItem(projectId: string, formData: FormData) {
  'use server'
  const category = String(formData.get('category') || '')
  const amount = String(formData.get('amount') || '')
  const note = String(formData.get('note') || '')
  const p = await prisma.project.findUnique({ where: { id: projectId } })
  const meta: any = p?.meta || {}
  const items: any[] = Array.isArray(meta?.budget?.items) ? meta.budget.items : []
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2)
  items.push({ id, category, amount, note })
  const total = items.reduce((sum, it) => sum + (parseFloat(it.amount) || 0), 0)
  meta.budget = { items, total }
  await prisma.project.update({ where: { id: projectId }, data: { meta } })
}

async function removeBudgetItem(projectId: string, formData: FormData) {
  'use server'
  const id = String(formData.get('id') || '')
  const p = await prisma.project.findUnique({ where: { id: projectId } })
  const meta: any = p?.meta || {}
  let items: any[] = Array.isArray(meta?.budget?.items) ? meta.budget.items : []
  items = items.filter((it:any) => String(it.id) !== id)
  const total = items.reduce((sum, it) => sum + (parseFloat(it.amount) || 0), 0)
  meta.budget = { items, total }
  await prisma.project.update({ where: { id: projectId }, data: { meta } })
}

async function applyAllSafeFixes(projectId: string) {
  'use server'
  const p = await prisma.project.findUnique({ where: { id: projectId }, include: { sections: true } })
  const fixes: any[] = (p?.meta as any)?.fixList || []
  if (!p || !Array.isArray(fixes)) return
  const byKey = new Map(p.sections.map(s => [s.key, s]))
  for (const f of fixes) {
    const patch = String(f.patch || '')
    if (!patch) continue
    const sec = byKey.get(String(f.sectionKey || ''))
    if (!sec) continue
    await prisma.section.update({ where: { id: sec.id }, data: { contentMd: (sec.contentMd || '') + '\n\n' + patch } })
  }
}

// RunAutopilotClient moved to client component file
