import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { client, defaultModel } from '@/lib/ai'

export const maxDuration = 300 // 5 minutes (Vercel Pro limit)

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const jobId = searchParams.get('jobId')
  if (!jobId) return NextResponse.json({ error: 'Missing jobId' }, { status: 400 })

  const job = await prisma.job.findUnique({ where: { id: jobId } })
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  try {
    await prisma.job.update({ where: { id: jobId }, data: { status: 'running', startedAt: new Date() } })

    // Load template + fields
    const template = await prisma.template.findUnique({ where: { id: job.templateId }, include: { fields: true } })
    if (!template) throw new Error('Template missing')

    // Compose the prompt by replacing ```qNinput``` tokens with provided inputs
    const prompt = renderPrompt(template.prompt, job.inputs as Record<string, string>)

    // Call OpenAI (simple single-call; chunking can be added if needed)
    const completion = await client.chat.completions.create({
      model: (template.model || defaultModel) as any,
      messages: [
        { role: 'system', content: 'You are a helpful grant writing assistant.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
    })

    const text = completion.choices[0]?.message?.content ?? ''
    const usage = completion.usage ?? undefined

    const response = await prisma.response.create({
      data: {
        projectId: job.projectId,
        templateId: job.templateId,
        inputs: job.inputs as any,
        output: text,
        model: template.model || defaultModel,
        tokenUsage: usage ? { prompt: usage.prompt_tokens, completion: usage.completion_tokens, total: usage.total_tokens } : undefined,
      },
    })

    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'succeeded', responseId: response.id, finishedAt: new Date() },
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    await prisma.job.update({ where: { id: jobId }, data: { status: 'failed', error: String(e), finishedAt: new Date() } })
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

function renderPrompt(template: string, inputs: Record<string, string>): string {
  // Replace occurrences of ```qNinput``` with the provided values; also replace [Label]: ```qNinput``` with label + value.
  let out = template
  // For safety, iterate over keys and replace both ```key``` and key tokens.
  for (const [k, v] of Object.entries(inputs)) {
    const codeToken = new RegExp("```" + escapeRegExp(k) + "```", 'g')
    const bareToken = new RegExp(escapeRegExp(k), 'g')
    out = out.replace(codeToken, v)
    out = out.replace(bareToken, v)
  }
  return out
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
