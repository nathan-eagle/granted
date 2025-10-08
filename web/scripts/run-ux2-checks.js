const fs = require('fs')
const path = require('path')

function simulateCompliance(text, options = {}) {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const wordCount = words.length
  const wordsPerPage = Math.max(500 * (options.hard_word_limit ? 1 : 1), 150)
  const estimatedPages = wordCount / wordsPerPage
  const overWord = options.hard_word_limit !== undefined && wordCount > options.hard_word_limit
  const overPage = options.soft_page_limit !== undefined && estimatedPages > options.soft_page_limit
  return {
    wordCount,
    estimatedPages,
    status: overWord || overPage ? 'overflow' : 'ok',
  }
}

function computeFixSuggestions(coverage) {
  return coverage.requirements
    .filter(req => req.status === 'missing' || req.status === 'stubbed')
    .map(req => {
      const weight = req.weight ?? 1
      const statusWeight = req.status === 'missing' ? 1 : 0.5
      const value = weight * statusWeight
      const effort = req.status === 'missing' ? 0.6 : 0.4
      const ratio = effort > 0 ? value / effort : value
      return {
        id: `fix-${req.id}`,
        requirementId: req.id,
        action: 'draft',
        label: `Resolve ${req.id}`,
        value_score: value,
        effort_score: effort,
        ratio,
      }
    })
    .sort((a, b) => b.ratio - a.ratio)
}

function buildConflictTopic(entry) {
  const kind = String(entry.kind ?? 'bundle').toLowerCase()
  const raw = String(entry.name ?? 'rfp').toLowerCase()
  const withoutExt = raw.replace(/\.[a-z0-9]+$/, '')
  const normalized = withoutExt
    .replace(/v\d+(?:\.\d+)?/g, '')
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return `${kind}:${normalized}`
}

function compareBundleEntries(a, b) {
  const parseDate = value => {
    if (!value) return NaN
    const ts = Date.parse(value)
    return Number.isNaN(ts) ? NaN : ts
  }
  const dateA = parseDate(a.release_date)
  const dateB = parseDate(b.release_date)
  if (!Number.isNaN(dateA) && !Number.isNaN(dateB) && dateA !== dateB) {
    return dateB - dateA
  }
  const versionA = a.version ?? ''
  const versionB = b.version ?? ''
  if (versionA && versionB && versionA !== versionB) {
    return versionB.localeCompare(versionA, undefined, { numeric: true, sensitivity: 'base' })
  }
  const nameA = a.name ?? ''
  const nameB = b.name ?? ''
  return nameA.localeCompare(nameB)
}

function mergeBundleMeta(persisted, fresh) {
  const merged = [...persisted, ...fresh]
  const seen = new Set()
  const deduped = []
  for (const entry of merged) {
    if (!entry.uploadId) {
      deduped.push(entry)
      continue
    }
    if (seen.has(entry.uploadId)) continue
    seen.add(entry.uploadId)
    deduped.push(entry)
  }
  deduped.sort(compareBundleEntries)
  return deduped
}

function runDeterministicChecks() {
  const sampleText = Array(800).fill('word').join(' ')
  const overflow = simulateCompliance(sampleText, { hard_word_limit: 400, soft_page_limit: 1 })
  if (overflow.status !== 'overflow') throw new Error('Compliance overflow expected')
  const ok = simulateCompliance(sampleText.slice(0, 2000), { hard_word_limit: 800, soft_page_limit: 4 })
  if (ok.status !== 'ok') throw new Error('Compliance should be ok')

  const coverage = {
    score: 0,
    requirements: [
      { id: 'narrative', status: 'missing', weight: 0.5 },
      { id: 'budget', status: 'stubbed', weight: 0.5 },
    ],
  }
  const suggestions = computeFixSuggestions(coverage)
  const ratios = suggestions.map(s => s.ratio)
  for (let i = 1; i < ratios.length; i++) {
    if (ratios[i] > ratios[i - 1] + 1e-3) throw new Error('Suggestions not sorted by ratio')
  }
  let drafted = coverage.score
  const requirements = coverage.requirements.map(req => ({ ...req }))
  suggestions.forEach(s => {
    const target = requirements.find(req => req.id === s.requirementId)
    if (target) target.status = 'drafted'
    const nextScore = requirements.filter(req => req.status === 'drafted').length / requirements.length
    if (nextScore + 1e-6 < drafted) throw new Error('Coverage decreased after suggestion')
    drafted = nextScore
  })

  const persisted = [
    { uploadId: 'old-faq', name: 'FAQ v1.pdf', kind: 'faq', kindDetail: 'faq', version: 'v1.0', release_date: '2024-01-15' },
  ]
  const fresh = [
    { uploadId: 'new-faq', name: 'FAQ v2.pdf', kind: 'faq', kindDetail: 'faq', version: 'v2.0', release_date: '2024-02-01' },
    { uploadId: 'addendum-a', name: 'Addendum A', kind: 'addendum', kindDetail: 'addendum', version: 'v1', release_date: '2024-01-20' },
  ]
  const merged = mergeBundleMeta(persisted, fresh)
  if (merged[0].uploadId !== 'new-faq') {
    throw new Error('Latest FAQ should appear first in bundle ordering')
  }
  const topicOriginal = buildConflictTopic(persisted[0])
  const topicNew = buildConflictTopic(fresh[0])
  if (topicOriginal !== topicNew) {
    throw new Error('FAQ conflict topic should match for new revisions')
  }
}

function verifyPrismaSchema() {
  const schemaPath = path.resolve(__dirname, '../prisma/schema.prisma')
  const contents = fs.readFileSync(schemaPath, 'utf8')
  if (!/model\s+AgentSession\s+{[\s\S]*memoryId/is.test(contents)) {
    throw new Error('AgentSession model missing memoryId field in prisma schema')
  }
  if (!/model\s+Upload\s+{[\s\S]*openAiFileId/is.test(contents)) {
    throw new Error('Upload model missing openAiFileId field in prisma schema')
  }
}

async function callAgentApiDemo() {
  const baseUrl = process.env.AGENTKIT_API_BASE || process.env.APP_URL
  if (!baseUrl) return
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

async function main() {
  runDeterministicChecks()
  verifyPrismaSchema()
  await callAgentApiDemo()
  console.log('AgentKit eval checks passed')
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
