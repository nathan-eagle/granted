import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { client, defaultModel } from '@/lib/ai'

const REVIEWER_PERSONAS = [
  {
    name: 'Dr. Sarah Chen',
    role: 'Senior Program Officer, Technical Review',
    expertise: 'I focus on technical merit, feasibility, and innovation. I look for rigorous methodology, clear hypotheses, and realistic timelines.',
    perspective: 'technical'
  },
  {
    name: 'Prof. Michael Rodriguez',
    role: 'Academic Research Director',
    expertise: 'I evaluate scientific significance, literature grounding, and potential for breakthrough discoveries. I emphasize intellectual merit and broader impacts.',
    perspective: 'academic'
  },
  {
    name: 'Dr. Jennifer Park',
    role: 'Industry Partnership Specialist',
    expertise: 'I assess commercialization potential, market applications, and real-world impact. I look for practical applications and economic viability.',
    perspective: 'industry'
  },
  {
    name: 'Dr. Robert Washington',
    role: 'Cross-Disciplinary Review Panel Chair',
    expertise: 'I evaluate overall proposal quality, team qualifications, and project management. I focus on clarity, completeness, and fundability.',
    perspective: 'overall'
  }
]

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { grantId } = await req.json()

    // Get the grant with all sections
    const grant = await prisma.grant.findFirst({
      where: {
        id: grantId,
        // @ts-ignore
        userId: session.user.id
      },
      include: {
        sections: {
          where: { content: { not: null } },
          orderBy: { order: 'asc' }
        }
      }
    })

    if (!grant) {
      return NextResponse.json({ error: 'Grant not found' }, { status: 404 })
    }

    // Generate reviews from multiple reviewers
    const reviews = await Promise.all(
      REVIEWER_PERSONAS.map(persona => generateReview(grant, persona))
    )

    // Save reviews to database
    await prisma.mockReview.createMany({
      data: reviews.map(review => ({
        grantId: grant.id,
        reviewerName: review.reviewerName,
        reviewerRole: review.reviewerRole,
        score: review.score,
        strengths: review.strengths,
        weaknesses: review.weaknesses,
        suggestions: review.suggestions
      }))
    })

    return NextResponse.json({ success: true, reviewCount: reviews.length })

  } catch (error) {
    console.error('Error generating mock reviews:', error)
    return NextResponse.json(
      { error: 'Failed to generate mock reviews' },
      { status: 500 }
    )
  }
}

async function generateReview(grant: any, persona: any) {
  const grantContent = buildGrantContent(grant)
  
  const prompt = `You are ${persona.name}, a ${persona.role}.

Your expertise: ${persona.expertise}

Please review the following grant proposal and provide:
1. A numerical score from 1-5 (where 5 is excellent, 1 is poor)
2. Key strengths of the proposal
3. Major weaknesses or concerns
4. Specific suggestions for improvement

Be constructive but honest. Focus on your area of expertise while considering the proposal holistically.

GRANT PROPOSAL:
${grantContent}

Please respond in this exact format:

SCORE: [1-5]

STRENGTHS:
[List 3-4 key strengths, each as a separate paragraph]

WEAKNESSES:
[List 3-4 major concerns or weaknesses, each as a separate paragraph]

SUGGESTIONS:
[Provide 3-5 specific, actionable suggestions for improvement]`

  try {
    const completion = await client.chat.completions.create({
      model: defaultModel,
      messages: [
        {
          role: 'system',
          content: `You are an expert grant reviewer with deep experience in evaluating research proposals. 
          You provide thorough, constructive feedback that helps researchers improve their proposals.
          Be specific, cite examples from the proposal, and provide actionable recommendations.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500
    })

    const response = completion.choices[0]?.message?.content || ''
    return parseReviewResponse(response, persona)

  } catch (error) {
    console.error('Error generating review from AI:', error)
    // Return a fallback review
    return {
      reviewerName: persona.name,
      reviewerRole: persona.role,
      score: 3,
      strengths: 'Unable to generate detailed review due to technical issues.',
      weaknesses: 'Review generation failed.',
      suggestions: 'Please try generating reviews again.'
    }
  }
}

function buildGrantContent(grant: any): string {
  let content = `TITLE: ${grant.title}\n\n`
  
  if (grant.agency) content += `FUNDING AGENCY: ${grant.agency}\n\n`
  if (grant.amount) content += `REQUESTED AMOUNT: ${grant.amount}\n\n`
  if (grant.keywords) content += `KEYWORDS: ${grant.keywords}\n\n`

  if (grant.proposalIdea) {
    content += `PROJECT OVERVIEW:\n${grant.proposalIdea}\n\n`
  }

  // Add section content
  grant.sections.forEach((section: any) => {
    if (section.content) {
      content += `${section.title.toUpperCase()}:\n${section.content}\n\n`
    }
  })

  return content
}

function parseReviewResponse(response: string, persona: any) {
  const scoreMatch = response.match(/SCORE:\s*(\d)/i)
  const score = scoreMatch ? parseInt(scoreMatch[1]) : 3

  const strengthsMatch = response.match(/STRENGTHS:\s*(.*?)\s*(?:WEAKNESSES:|$)/is)
  const strengths = strengthsMatch ? strengthsMatch[1].trim() : 'No specific strengths identified.'

  const weaknessesMatch = response.match(/WEAKNESSES:\s*(.*?)\s*(?:SUGGESTIONS:|$)/is)
  const weaknesses = weaknessesMatch ? weaknessesMatch[1].trim() : 'No specific weaknesses identified.'

  const suggestionsMatch = response.match(/SUGGESTIONS:\s*(.*?)$/is)
  const suggestions = suggestionsMatch ? suggestionsMatch[1].trim() : 'No specific suggestions provided.'

  return {
    reviewerName: persona.name,
    reviewerRole: persona.role,
    score,
    strengths,
    weaknesses,
    suggestions
  }
}
