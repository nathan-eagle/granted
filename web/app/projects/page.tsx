import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import ProjectsGrid from '@/components/ProjectsGrid'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

async function getProjects(userId: string) {
  return prisma.project.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
}

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect('/')
  // @ts-ignore
  const userId = session.user.id as string
  const projects = await getProjects(userId)

  return (
    <div>
      <h1>Projects</h1>
      <form action={createProject} style={{margin:'12px 0'}}>
        <input type="text" name="name" placeholder="New project name" required />
        <button type="submit" style={{marginLeft:8}}>Create</button>
      </form>
      <ProjectsGrid items={projects as any} />
    </div>
  )
}

async function createProject(formData: FormData) {
  'use server'
  const session = await getServerSession(authOptions)
  if (!session?.user) return
  // @ts-ignore
  const userId = session.user.id as string
  const name = String(formData.get('name'))
  const project = await prisma.project.create({ data: { userId, name } })
  return redirect(`/project/${project.id}/draft`)
}
