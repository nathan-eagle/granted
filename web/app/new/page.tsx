import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

function loadPackIds() {
  const dir = path.join(process.cwd(), 'lib/agencyPacks')
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'))
  return files.map(f => ({ id: f.replace(/\.json$/, ''), file: f }))
}

export default async function NewProjectPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/api/auth/signin?callbackUrl=/new')
  const packs = loadPackIds()
  return (
    <div>
      <h1>Start an SBIR Draft</h1>
      <form action={createProject}>
        <label style={{display:'block',margin:'12px 0 4px'}}>Select Agency Pack</label>
        <select name="pack" required>
          {packs.map(p => <option key={p.id} value={p.file}>{p.id}</option>)}
        </select>
        <div style={{marginTop:12}}>
          <button type="submit">Create Project & Autodraft</button>
        </div>
      </form>
    </div>
  )
}

async function createProject(formData: FormData) {
  'use server'
  const session = await getServerSession(authOptions)
  if (!session?.user) return
  // @ts-ignore
  const userId = session.user.id as string
  const packFile = String(formData.get('pack'))
  const name = 'SBIR Draft'
  const project = await prisma.project.create({ data: { userId, name, agencyPackId: packFile, status: 'drafting' } })
  await placeholderAutodraft(project.id)
  redirect(`/project/${project.id}/draft`)
}

async function placeholderAutodraft(projectId: string) {
  const sections = [
    { key: 'overview', title: 'Project Overview', order: 1 },
    { key: 'technical', title: 'Technical Volume', order: 2 },
    { key: 'commercial', title: 'Commercialization Plan', order: 3 },
  ]
  await prisma.section.createMany({ data: sections.map(s => ({ ...s, projectId, contentMd: 'Lorem ipsum draft. [MISSING: Problem] [MISSING: Market]' })) })
}

