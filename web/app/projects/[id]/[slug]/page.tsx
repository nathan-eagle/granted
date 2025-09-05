import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { notFound } from 'next/navigation'

export default async function TemplateRunPage({ params }: { params: { id: string, slug: string } }) {
  const session = await getServerSession()
  if (!session?.user) notFound()
  // @ts-ignore
  const userId = session.user.id as string
  const project = await prisma.project.findFirst({ where: { id: params.id, userId } })
  if (!project) notFound()
  const template = await prisma.template.findFirst({ where: { slug: params.slug }, include: { fields: { orderBy: { order: 'asc' } } } })
  if (!template) notFound()

  return (
    <div>
      <h1>{template.title}</h1>
      <p style={{color:'#555'}}>{template.about}</p>
      <form action={createJob.bind(null, project.id, template.id)}>
        {template.fields.map(f => (
          <div key={f.id} style={{margin:'12px 0'}}>
            <label style={{display:'block', fontWeight:600}}>{f.label}</label>
            {f.type === 'long' ? (
              <textarea name={f.key} placeholder={f.placeholder ?? ''} rows={4} style={{width:'100%'}} />
            ) : (
              <input name={f.key} placeholder={f.placeholder ?? ''} style={{width:'100%'}} />
            )}
            {f.help ? <div style={{fontSize:12, color:'#666'}}>{f.help}</div> : null}
          </div>
        ))}
        <button type="submit">Write for me</button>
      </form>
    </div>
  )
}

async function createJob(projectId: string, templateId: string, formData: FormData) {
  'use server'
  const session = await getServerSession()
  if (!session?.user) return
  // @ts-ignore
  const userId = session.user.id as string
  const inputs: Record<string, string> = {}
  for (const [k, v] of formData.entries()) inputs[k] = String(v)
  const res = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, templateId, inputs })
  })
  const data = await res.json()
  return redirectToJob(projectId, data.jobId)
}

import { redirect } from 'next/navigation'
async function redirectToJob(projectId: string, jobId: string) {
  redirect(`/responses/${jobId}`)
}

