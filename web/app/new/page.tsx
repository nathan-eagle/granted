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
          <strong>Six quick questions (optional)</strong>
        </div>
        <div style={{display:'grid',gap:8,marginTop:8}}>
          <input name="q_problem" placeholder="Problem (who/what)" />
          <input name="q_innovation" placeholder="Innovation vs alternatives" />
          <input name="q_customer" placeholder="Who pays / market" />
          <input name="q_evidence" placeholder="Evidence today (prototype, pilots)" />
          <input name="q_milestones" placeholder="Phase I milestones (comma-separated)" />
          <input name="q_risks" placeholder="Top risks" />
        </div>
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
  const charter = {
    problem: String(formData.get('q_problem') || ''),
    innovation: String(formData.get('q_innovation') || ''),
    customer: String(formData.get('q_customer') || ''),
    evidence: String(formData.get('q_evidence') || ''),
    milestones: String(formData.get('q_milestones') || ''),
    risks: String(formData.get('q_risks') || ''),
  }
  const project = await prisma.project.create({ data: { userId, name, agencyPackId: packFile, status: 'drafting', charterJson: charter } })
  // Kick real autodraft
  await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/autopilot/autodraft`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ projectId: project.id }) }).catch(()=>{})
  redirect(`/project/${project.id}/draft`)
}

