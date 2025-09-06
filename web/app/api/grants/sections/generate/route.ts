import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sectionId, sectionTitle, grantInfo } = await req.json()

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

    // Build context for AI generation
    const context = buildSectionContext(sectionTitle, grantInfo)
    
    // Generate content with OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an expert grant writer helping to write a ${sectionTitle} section for a grant proposal. 
          
          Write professional, compelling content that:
          - Is specifically tailored to the grant opportunity and applicant
          - Uses clear, academic language appropriate for the funding agency
          - Includes specific details and demonstrates expertise
          - Is well-structured with appropriate headings if needed
          - Follows best practices for grant writing
          
          Format your response as clean text without markdown headers unless specifically needed for structure.`
        },
        {
          role: 'user',
          content: context
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    })

    const generatedContent = completion.choices[0]?.message?.content || ''

    // Save AI draft to database
    await prisma.grantSection.update({
      where: { id: sectionId },
      data: { aiDraft: generatedContent }
    })

    return NextResponse.json({
      success: true,
      content: generatedContent
    })

  } catch (error) {
    console.error('Error generating section:', error)
    return NextResponse.json(
      { error: 'Failed to generate section' },
      { status: 500 }
    )
  }
}

function buildSectionContext(sectionTitle: string, grantInfo: any): string {
  const {
    title,
    agency,
    rfpContent,
    proposalIdea,
    applicantInfo,
    teamMembers,
    keywords
  } = grantInfo

  let context = `Please write the "${sectionTitle}" section for the following grant proposal:

GRANT TITLE: ${title}
FUNDING AGENCY: ${agency || 'Not specified'}
KEYWORDS: ${keywords || 'Not provided'}

`

  if (proposalIdea) {
    context += `PROJECT DESCRIPTION:
${proposalIdea}

`
  }

  if (applicantInfo?.primaryInvestigator) {
    context += `PRINCIPAL INVESTIGATOR: ${applicantInfo.primaryInvestigator}
ORGANIZATION: ${applicantInfo.organization || 'Not specified'}
`

    if (applicantInfo.cv) {
      context += `PI BACKGROUND: ${applicantInfo.cv.substring(0, 500)}...
`
    }
  }

  if (teamMembers && Array.isArray(teamMembers) && teamMembers.length > 0) {
    context += `
TEAM MEMBERS:
${teamMembers.map((member: any) => 
  `- ${member.name} (${member.role}): ${member.bio?.substring(0, 200) || 'No bio provided'}`
).join('\n')}

`
  }

  if (rfpContent) {
    context += `GRANT REQUIREMENTS (from RFP):
${rfpContent.substring(0, 1000)}...

`
  }

  // Add section-specific guidance
  const sectionGuidance = getSectionGuidance(sectionTitle)
  if (sectionGuidance) {
    context += `SPECIFIC GUIDANCE FOR ${sectionTitle.toUpperCase()}:
${sectionGuidance}

`
  }

  context += `Please write a compelling ${sectionTitle} section that addresses the specific requirements and demonstrates why this proposal should be funded.`

  return context
}

function getSectionGuidance(sectionTitle: string): string {
  const guidance: { [key: string]: string } = {
    'Project Summary': `
- Keep it concise (typically 1 page or less)
- Include the problem statement, objectives, methods, and expected outcomes
- Write for both technical and non-technical reviewers
- Highlight the innovation and potential impact`,

    'Project Description': `
- Provide detailed technical approach and methodology
- Include literature review and current state of knowledge
- Explain the innovation and significance of the work
- Describe expected results and their implications`,

    'Research Plan': `
- Break down into specific aims or objectives
- Provide detailed methodology for each aim
- Include timeline and milestones
- Address potential risks and alternative approaches`,

    'Budget & Budget Justification': `
- Provide detailed breakdown of costs
- Justify all major expenses
- Explain personnel effort and qualifications
- Include equipment, supplies, and other direct costs`,

    'Team & Qualifications': `
- Highlight relevant expertise of all team members
- Show how the team is uniquely qualified for this work
- Describe each member's specific role and contribution
- Include relevant publications and achievements`,

    'Broader Impacts': `
- Explain societal benefits beyond the research
- Address education, training, and outreach activities
- Discuss diversity and inclusion efforts
- Describe knowledge transfer and commercialization potential`,

    'Timeline & Milestones': `
- Provide detailed project timeline
- Include major milestones and deliverables
- Show how tasks are interconnected
- Include contingency plans for potential delays`
  }

  return guidance[sectionTitle] || ''
}