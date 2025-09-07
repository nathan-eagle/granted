import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import NewWizard from '@/components/NewWizard'

function loadPackIds() {
  const dir = path.join(process.cwd(), 'lib/agencyPacks')
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'))
  return files.map(f => ({ id: f.replace(/\.json$/, ''), file: f }))
}

export default async function NewProjectPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/api/auth/signin?callbackUrl=/new')
  const packs = loadPackIds()
  const packItems = packs.map(p => ({ ...p, label: p.file.includes('nih') ? 'NIH SBIR Phase I' : 'NSF SBIR Phase I' }))
  return (
    <div>
      <h1>Autowrite my SBIR</h1>
      {/* Client stepper wizard */}
      {/* @ts-expect-error Server-to-client prop */}
      <NewWizard packs={packItems} />
    </div>
  )
}
export async function POST(req: Request){
  const session = await getServerSession(authOptions)
  if (!(session as any)?.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  // @ts-ignore
  const userId = (session as any).user.id as string
  const fd = await req.formData()
  const packFile = String(fd.get('pack'))
  const charter = {
    problem: String(fd.get('problem') || fd.get('q_problem') || ''),
    innovation: String(fd.get('innovation') || fd.get('q_innovation') || ''),
    customer: String(fd.get('customer') || fd.get('q_customer') || ''),
    evidence: String(fd.get('evidence') || fd.get('q_evidence') || ''),
    milestones: String(fd.get('milestones') || fd.get('q_milestones') || ''),
    risks: String(fd.get('risks') || fd.get('q_risks') || ''),
  }
  const project = await prisma.project.create({ data: { userId, name: 'SBIR Draft', agencyPackId: packFile, status: 'drafting', charterJson: charter } })
  return new Response(JSON.stringify({ projectId: project.id }), { headers: { 'Content-Type': 'application/json' } })
}
