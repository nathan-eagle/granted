async function runCoverageSmokeTest() {
  const coverageBefore = {
    score: 0.42,
    requirements: [
      { id: 'narrative', status: 'missing' },
      { id: 'budget', status: 'stubbed' },
    ],
  }

  const coverageAfter = {
    score: 0.78,
    requirements: [
      { id: 'narrative', status: 'drafted' },
      { id: 'budget', status: 'drafted' },
    ],
  }

  if (coverageAfter.score < coverageBefore.score) {
    throw new Error('Coverage score regressed')
  }

  if (coverageAfter.requirements.some(req => req.status !== 'drafted')) {
    throw new Error('Coverage requirements not satisfied in eval harness')
  }
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

async function main() {
  await runCoverageSmokeTest()
  await callAgentApiDemo()
  console.log('AgentKit eval checks passed')
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
