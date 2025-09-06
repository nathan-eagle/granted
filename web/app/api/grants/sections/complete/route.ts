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

    const { sectionId, isComplete } = await req.json()

    // Verify user owns this section
    const section = await prisma.grantSection.findFirst({
      where: {
        id: sectionId,
        grant: {
          // @ts-ignore
          userId: session.user.id
        }
      }
    })

    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }

    // Update section completion status
    await prisma.grantSection.update({
      where: { id: sectionId },
      data: {
        isComplete,
        updatedAt: new Date()
      }
    })

    // Check if all sections are complete and update grant status
    if (isComplete) {
      const grant = await prisma.grant.findFirst({
        where: { id: section.grantId },
        include: { sections: true }
      })

      if (grant) {
        const allComplete = grant.sections.every(s => 
          s.id === sectionId ? isComplete : s.isComplete
        )

        if (allComplete && grant.status !== 'COMPLETE') {
          await prisma.grant.update({
            where: { id: grant.id },
            data: { status: 'COMPLETE' }
          })
        }
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error updating section status:', error)
    return NextResponse.json(
      { error: 'Failed to update section status' },
      { status: 500 }
    )
  }
}