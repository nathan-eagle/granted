import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import SectionEditor from '@/components/SectionEditor'

export const dynamic = 'force-dynamic'

async function getGrant(grantId: string, userId: string) {
  return prisma.grant.findFirst({
    where: { id: grantId, userId },
    include: {
      sections: {
        orderBy: { order: 'asc' }
      },
      project: true
    }
  })
}

export default async function GrantDetailPage({ 
  params 
}: { 
  params: { id: string; grantId: string } 
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) notFound()
  
  // @ts-ignore
  const userId = session.user.id as string
  const grant = await getGrant(params.grantId, userId)
  if (!grant) notFound()

  const completedSections = grant.sections.filter(s => s.isComplete).length
  const totalSections = grant.sections.length
  const progressPercent = totalSections > 0 ? (completedSections / totalSections) * 100 : 0

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: '2rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div style={{ flex: '1' }}>
          <Link 
            href={`/projects/${params.id}/grants`}
            style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.875rem' }}
          >
            ← Back to Grants
          </Link>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem', marginBottom: '1rem' }}>
            {grant.title}
          </h1>
          
          <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Agency: </span>
              <span style={{ fontWeight: '600' }}>{grant.agency || 'Not specified'}</span>
            </div>
            
            {grant.deadline && (
              <div>
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Deadline: </span>
                <span style={{ fontWeight: '600', color: '#ef4444' }}>
                  {new Date(grant.deadline).toLocaleDateString()}
                </span>
              </div>
            )}
            
            {grant.amount && (
              <div>
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Amount: </span>
                <span style={{ fontWeight: '600' }}>{grant.amount}</span>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>Progress</span>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                {completedSections}/{totalSections} sections complete
              </span>
            </div>
            <div style={{ 
              width: '100%', 
              backgroundColor: '#e5e7eb', 
              height: '0.75rem', 
              borderRadius: '0.375rem' 
            }}>
              <div style={{
                width: `${progressPercent}%`,
                backgroundColor: progressPercent === 100 ? '#10b981' : '#3b82f6',
                height: '100%',
                borderRadius: '0.375rem',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {progressPercent === 100 && (
            <Link
              href={`/projects/${params.id}/grants/${grant.id}/review`}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#8b5cf6',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '0.5rem',
                fontWeight: '600'
              }}
            >
              Mock Review
            </Link>
          )}
          
          <button
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Export
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}>
        {/* Sidebar - Section Navigation */}
        <div style={{ backgroundColor: '#f9fafb', padding: '1.5rem', borderRadius: '0.5rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
            Sections
          </h3>
          
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {grant.sections.map((section) => (
              <a
                key={section.id}
                href={`#section-${section.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  backgroundColor: section.isComplete ? '#dcfce7' : 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.375rem',
                  textDecoration: 'none',
                  color: '#374151',
                  fontSize: '0.875rem',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>{section.title}</span>
                {section.isComplete && (
                  <span style={{ color: '#10b981', fontSize: '1rem' }}>✓</span>
                )}
              </a>
            ))}
          </div>

          {/* Grant Information Summary */}
          <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: 'white', borderRadius: '0.375rem', border: '1px solid #e5e7eb' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem' }}>
              Key Information
            </h4>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', display: 'grid', gap: '0.5rem' }}>
              {grant.keywords && (
                <div>
                  <strong>Keywords:</strong> {grant.keywords}
                </div>
              )}
              {grant.applicantInfo && (grant.applicantInfo as any).primaryInvestigator && (
                <div>
                  <strong>PI:</strong> {(grant.applicantInfo as any).primaryInvestigator}
                </div>
              )}
              {grant.teamMembers && Array.isArray(grant.teamMembers) && grant.teamMembers.length > 0 && (
                <div>
                  <strong>Team:</strong> {grant.teamMembers.length} members
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content - Section Editor */}
        <div>
          {grant.sections.map((section) => (
            <div key={section.id} id={`section-${section.id}`} style={{ marginBottom: '3rem' }}>
              <SectionEditor 
                section={section}
                grantInfo={{
                  title: grant.title,
                  agency: grant.agency,
                  rfpContent: grant.rfpContent,
                  proposalIdea: grant.proposalIdea,
                  applicantInfo: grant.applicantInfo,
                  teamMembers: grant.teamMembers,
                  keywords: grant.keywords
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}