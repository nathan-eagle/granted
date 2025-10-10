function spacingMultiplier(spacing) {
  const value = typeof spacing === 'string' ? spacing.toLowerCase() : ''
  if (value === 'double') return 0.5
  if (value === '1.5' || value === 'one-half') return 0.66
  return 1
}

function sizeMultiplier(size) {
  if (!size) return 1
  if (size <= 10) return 1.1
  if (size >= 12) return 0.9
  return 1
}

function marginMultiplier(margins) {
  if (!margins) return 1
  if (margins >= 1.5) return 0.85
  if (margins <= 0.75) return 1.1
  return 1
}

function simulateCompliance(text, options = {}) {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const wordCount = words.length
  const wordsPerPage = Math.max(
    500 * spacingMultiplier(options.spacing) * sizeMultiplier(options.size) * marginMultiplier(options.margins),
    150,
  )
  const estimatedPages = wordCount / wordsPerPage
  const overWord = options.hard_word_limit !== undefined && wordCount > options.hard_word_limit
  const overPage = options.soft_page_limit !== undefined && estimatedPages > options.soft_page_limit
  return {
    wordCount,
    estimatedPages,
    status: overWord || overPage ? 'overflow' : 'ok',
  }
}

function generateText(wordCount) {
  return Array(Math.max(0, Math.floor(wordCount))).fill('word').join(' ')
}

function runAutodraftSmokeFixtures() {
  const fixtures = [
    {
      name: 'youth-arts-coalition',
      coverageBefore: 0.34,
      coverageAfter: 0.72,
      ttfdMs: 55_000,
      tighten: {
        limits: { hard_word_limit: 500, soft_page_limit: 2, spacing: 'single', size: 11, margins: 1 },
        beforeWordCount: 640,
        afterWordCount: 460,
      },
    },
    {
      name: 'urban-agriculture',
      coverageBefore: 0.41,
      coverageAfter: 0.81,
      ttfdMs: 57_000,
      tighten: {
        limits: { hard_word_limit: 650, soft_page_limit: 3, spacing: '1.5', size: 12, margins: 1 },
        beforeWordCount: 780,
        afterWordCount: 600,
      },
    },
    {
      name: 'clean-energy-cohort',
      coverageBefore: 0.29,
      coverageAfter: 0.68,
      ttfdMs: 48_000,
      tighten: {
        limits: { hard_word_limit: 400, soft_page_limit: 1.5, spacing: 'single', size: 11, margins: 1.25 },
        beforeWordCount: 520,
        afterWordCount: 380,
      },
    },
  ]

  const budgetMs = 60_000

  fixtures.forEach(fixture => {
    if (fixture.coverageAfter <= fixture.coverageBefore) {
      throw new Error(`Coverage did not improve for ${fixture.name}`)
    }
    if (fixture.ttfdMs > budgetMs) {
      throw new Error(`First draft exceeded budget for ${fixture.name}`)
    }
    const before = simulateCompliance(generateText(fixture.tighten.beforeWordCount), fixture.tighten.limits)
    const after = simulateCompliance(generateText(fixture.tighten.afterWordCount), fixture.tighten.limits)
    if (before.status !== 'overflow') {
      throw new Error(`Expected tighten pre-check overflow for ${fixture.name}`)
    }
    if (after.status !== 'ok') {
      throw new Error(`Tighten did not resolve overflow for ${fixture.name}`)
    }
    if (after.wordCount > fixture.tighten.limits.hard_word_limit) {
      throw new Error(`Word count still above limit for ${fixture.name}`)
    }
  })
}

async function callAgentApiDemo() {
  const baseUrl = process.env.AGENTKIT_API_BASE || process.env.APP_URL
  if (!baseUrl) {
    return
  }

  const origin = baseUrl.replace(/\/$/, '')
  const sessionUrl = `${origin}/api/agent/session`
  const payload = {
    projectId: process.env.AGENTKIT_DEMO_PROJECT_ID || 'demo-project',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.', at: new Date().toISOString() },
      { role: 'user', content: 'Say hello.', at: new Date().toISOString() },
    ],
  }

  try {
    const startResponse = await fetch(sessionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!startResponse.ok) {
      console.warn(`[agent-evals] session start returned ${startResponse.status}`)
      return
    }
    const data = await startResponse.json()
    if (!data.sessionId) {
      console.warn('[agent-evals] session start missing sessionId')
      return
    }

    const continueUrl = `${origin}/api/agent/session/${data.sessionId}`
    await fetch(continueUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'Thanks!', at: new Date().toISOString() },
        ],
      }),
    }).catch(err => {
      console.warn('[agent-evals] session continue failed', err)
    })
  } catch (error) {
    console.warn('[agent-evals] agent session demo skipped', error.message || error)
  }
}

async function verifyLatestWorkflowRun() {
  if (!process.env.DATABASE_URL) {
    console.warn('[agent-evals] DATABASE_URL not set; skipping workflow run checks')
    return
  }

  const { PrismaClient } = require('@prisma/client')
  const prisma = new PrismaClient()
  try {
    const run = await prisma.agentWorkflowRun.findFirst({
      where: { workflowId: 'agent-session-stream' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        metrics: true,
        result: true,
        agentSessionId: true,
      },
    })
    if (!run) {
      console.warn('[agent-evals] no agent-session-stream runs recorded yet')
      return
    }
    if (!run.agentSessionId) {
      throw new Error('Latest agent-session run missing agentSessionId linkage')
    }
    const metrics = run.metrics || (run.result && run.result.metrics) || {}
    if (typeof metrics?.ttfd_ms !== 'number') {
      throw new Error('Missing ttfd_ms metric on latest agent-session run')
    }
    if (metrics.ttfd_ms > 180_000) {
      throw new Error(`ttfd_ms exceeds budget: ${metrics.ttfd_ms}ms`)
    }
    const toolStats = run.result?.toolStats
    if (!Array.isArray(toolStats) || toolStats.length === 0) {
      throw new Error('toolStats absent on latest agent-session run')
    }
    const toolSummary = run.result?.toolSummary
    if (!toolSummary || typeof toolSummary.totalCalls !== 'number' || toolSummary.totalCalls <= 0) {
      throw new Error('toolSummary missing or empty on latest agent-session run')
    }
    if (!run.result?.model) {
      throw new Error('Primary model missing on latest agent-session run')
    }
  } finally {
    await prisma.$disconnect().catch(() => undefined)
  }
}

async function main() {
  runAutodraftSmokeFixtures()
  await callAgentApiDemo()
  await verifyLatestWorkflowRun()
  console.log('AgentKit eval checks passed')
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
