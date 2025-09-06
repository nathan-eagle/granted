import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // @ts-ignore
    const userId = session.user.id as string
    const data = await req.json()

    // Create the grant
    const grant = await prisma.grant.create({
      data: {
        userId,
        projectId: data.projectId,
        title: data.title,
        agency: data.agency,
        rfpUrl: data.rfpUrl,
        deadline: data.deadline ? new Date(data.deadline) : null,
        amount: data.amount,
        rfpContent: data.rfpContent,
        applicantInfo: data.applicantInfo,
        teamMembers: data.teamMembers,
        proposalIdea: data.proposalIdea,
        keywords: data.keywords,
        status: 'DRAFT',
        currentStep: 1,
      },
    })

    // Create default sections based on grant type
    const defaultSections = [
      { title: 'Project Summary', order: 1 },
      { title: 'Project Description', order: 2 },
      { title: 'Research Plan', order: 3 },
      { title: 'Budget & Budget Justification', order: 4 },
      { title: 'Team & Qualifications', order: 5 },
      { title: 'Broader Impacts', order: 6 },
      { title: 'Timeline & Milestones', order: 7 },
      { title: 'References', order: 8 },
    ]

    await prisma.grantSection.createMany({
      data: defaultSections.map(section => ({
        grantId: grant.id,
        title: section.title,
        order: section.order,
      })),
    })

    return NextResponse.json({ 
      success: true, 
      grantId: grant.id,
      message: 'Grant created successfully' 
    })

  } catch (error) {
    console.error('Error creating grant:', error)
    return NextResponse.json(
      { error: 'Failed to create grant' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // @ts-ignore
    const userId = session.user.id as string
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')

    const where = projectId ? { userId, projectId } : { userId }

    const grants = await prisma.grant.findMany({
      where,
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

    return NextResponse.json({ grants })

  } catch (error) {
    console.error('Error fetching grants:', error)
    return NextResponse.json(
      { error: 'Failed to fetch grants' },
      { status: 500 }
    )
  }
}