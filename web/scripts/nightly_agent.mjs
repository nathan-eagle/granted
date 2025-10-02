import fs from "node:fs/promises"

const baseUrl = process.env.AGENT_BASE_URL || "https://granted-one.vercel.app"
const payload = {
  sources: [
    {
      filename: "reference.txt",
      text: "Nightly agent seed source generated on " + new Date().toISOString(),
    },
  ],
}

const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/agent/run`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
})

const bodyText = await res.text()
const log = {
  timestamp: new Date().toISOString(),
  baseUrl,
  status: res.status,
  ok: res.ok,
  response: (() => {
    try {
      return JSON.parse(bodyText)
    } catch {
      return bodyText
    }
  })(),
}

if (!res.ok) {
  await fs.writeFile("nightly-agent.log", JSON.stringify(log, null, 2))
  throw new Error(`Nightly agent failed with status ${res.status}`)
}

await fs.writeFile("nightly-agent.log", JSON.stringify(log, null, 2))
