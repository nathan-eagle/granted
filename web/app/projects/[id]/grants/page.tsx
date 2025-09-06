import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import GrantWizard from '@/components/GrantWizard'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

async function getProjectGrants(projectId: string, userId: string) {
  return prisma.grant.findMany({
    where: { projectId, userId },
    include: {
      sections: {
        orderBy: { order: 'asc' }
      },
      _count: {
        select: {
          sections: {
            where: { isComplete: true }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
}

async function getProject(id: string, userId: string) {
  return prisma.project.findFirst({ where: { id, userId } })
}

export default async function ProjectGrantsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) notFound()
  
  // @ts-ignore
  const userId = session.user.id as string
  const project = await getProject(params.id, userId)
  if (!project) notFound()

  const grants = await getProjectGrants(params.id, userId)

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            Grant Applications
          </h1>
          <p style={{ color: '#6b7280' }}>Project: {project.name}</p>
        </div>
        
        <Link
          href={`/projects/${params.id}/grants/new`}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '0.5rem',
            fontWeight: '600'
          }}
        >
          New Grant Application
        </Link>
      </div>

      {grants.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          backgroundColor: '#f9fafb',
          borderRadius: '0.5rem',
          border: '1px dashed #d1d5db'
        }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
            No grant applications yet
          </h3>
          <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
            Create your first grant application with our guided wizard
          </p>
          <Link
            href={`/projects/${params.id}/grants/new`}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '0.5rem',
              fontWeight: '600'
            }}
          >
            Get Started
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.5rem' }}>
          {grants.map((grant) => (
            <GrantCard key={grant.id} grant={grant} projectId={params.id} />
          ))}
        </div>
      )}
    </div>
  )
}

function GrantCard({ grant, projectId }: { grant: any; projectId: string }) {
  const completedSections = grant._count.sections
  const totalSections = grant.sections.length
  const progressPercent = totalSections > 0 ? (completedSections / totalSections) * 100 : 0

  const statusColors = {
    DRAFT: '#6b7280',
    IN_PROGRESS: '#f59e0b',
    REVIEW: '#8b5cf6',
    COMPLETE: '#10b981',
    SUBMITTED: '#059669'
  }

  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: '0.5rem',
      padding: '1.5rem',
      backgroundColor: 'white',
      transition: 'shadow 0.2s ease'
    }}>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            {grant.title}
          </h3>
          <span style={{
            padding: '0.25rem 0.75rem',
            backgroundColor: statusColors[grant.status as keyof typeof statusColors],
            color: 'white',
            fontSize: '0.75rem',
            borderRadius: '9999px',
            fontWeight: '600'
          }}>
            {grant.status.replace('_', ' ')}
          </span>
        </div>
        
        {grant.agency && (
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            {grant.agency}
          </p>
        )}
        
        {grant.deadline && (
          <p style={{ color: '#ef4444', fontSize: '0.875rem' }}>
            Deadline: {new Date(grant.deadline).toLocaleDateString()}
          </p>
        )}
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>Progress</span>
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            {completedSections}/{totalSections} sections
          </span>
        </div>
        <div style={{ 
          width: '100%', 
          backgroundColor: '#e5e7eb', 
          height: '0.5rem', 
          borderRadius: '0.25rem' 
        }}>
          <div style={{
            width: `${progressPercent}%`,
            backgroundColor: progressPercent === 100 ? '#10b981' : '#3b82f6',
            height: '100%',
            borderRadius: '0.25rem',
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Link
          href={`/projects/${projectId}/grants/${grant.id}`}
          style={{
            flex: '1',
            padding: '0.5rem 1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            textDecoration: 'none',
            textAlign: 'center',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            fontWeight: '600'
          }}
        >
          Continue
        </Link>
        
        {grant.status === 'COMPLETE' && (
          <Link
            href={`/projects/${projectId}/grants/${grant.id}/review`}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#8b5cf6',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: '600'
            }}
          >
            Review
          </Link>
        )}
      </div>
    </div>
  )
}