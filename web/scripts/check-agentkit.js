#!/usr/bin/env node

const requiredEnv = ["OPENAI_API_KEY", "AGENTKIT_PROJECT_ID", "AGENTKIT_WORKFLOW_ID"]
const missing = requiredEnv.filter(key => !process.env[key] || !process.env[key].trim())

if (missing.length) {
  console.error("[AgentKit check] Missing required environment variables:", missing.join(", "))
  process.exit(1)
}

console.log("[AgentKit check] Required variables present.")

if (process.env.AGENTKIT_CHECK_SKIP_NETWORK === "1") {
  console.log("[AgentKit check] Skipping network call (AGENTKIT_CHECK_SKIP_NETWORK=1). Update once AgentKit project API is accessible.")
  process.exit(0)
}

const apiKey = process.env.OPENAI_API_KEY
const projectId = process.env.AGENTKIT_PROJECT_ID
const baseUrl = (process.env.OPENAI_API_BASE || "https://api.openai.com/v1").replace(/\/$/, "")
const url = `${baseUrl}/agentkit/projects/${projectId}`

async function main() {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "agentkit=2025-10-07",
      },
    })

    if (!response.ok) {
      const body = await response.text()
      console.error(`[AgentKit check] Request failed (${response.status} ${response.statusText}). Body:`, body)
      process.exit(1)
    }

    console.log("[AgentKit check] AgentKit project lookup succeeded.")
  } catch (error) {
    console.error("[AgentKit check] Network request failed:", error)
    process.exit(1)
  }
}

main()
