import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import MockReviewSystem from '@/components/MockReviewSystem'

export const dynamic = 'force-dynamic'

async function getGrantWithReviews(grantId: string, userId: string) {
  return prisma.grant.findFirst({
    where: { id: grantId, userId },
    include: {
      sections: {
        orderBy: { order: 'asc' }
      },
      mockReviews: {
        orderBy: { createdAt: 'desc' }
      },
      project: true
    }
  })
}

export default async function MockReviewPage({ 
  params 
}: { 
  params: { id: string; grantId: string } 
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) notFound()
  
  // @ts-ignore
  const userId = session.user.id as string
  const grant = await getGrantWithReviews(params.grantId, userId)
  if (!grant) notFound()

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <Link 
          href={`/projects/${params.id}/grants/${params.grantId}`}
          style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.875rem' }}
        >
          ← Back to Grant
        </Link>
        
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '1rem', marginBottom: '0.5rem' }}>
          Mock Review
        </h1>
        <p style={{ color: '#6b7280', fontSize: '1.125rem' }}>
          {grant.title}
        </p>
      </div>

      <MockReviewSystem grant={grant} />
    </div>
  )
}