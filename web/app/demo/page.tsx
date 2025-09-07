import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function DemoPage(){
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/api/auth/signin?callbackUrl=/demo')
  // @ts-ignore
  const userId = session.user.id as string
  const project = await prisma.project.create({ data: {
    userId,
    name: 'Sample SBIR Draft',
    agencyPackId: 'nsf_sbir_phase_i_2025.json',
    status: 'drafting',
    charterJson: {
      problem: 'Small labs lack an easy way to automate assay analysis',
      innovation: 'Novel ML-based pipeline with cloud sync',
      customer: 'Academic labs; CROs',
      evidence: 'Prototype in Python; 3 pilot users',
      milestones: 'MVP; 5 pilots; analysis speed 2x',
      risks: 'Regulatory; data quality',
    }
  }})
  // Add a tiny sample upload
  await prisma.upload.create({ data: { projectId: project.id, kind: 'boilerplate', filename: 'company.txt', text: 'Founded 2023; team with prior NSF award; early partners: LabX, CRO-Y. Speedup 2x in pilot.' } })
  redirect(`/project/${project.id}/draft?run=1`)
}

