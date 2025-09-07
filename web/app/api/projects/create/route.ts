import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest){
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

