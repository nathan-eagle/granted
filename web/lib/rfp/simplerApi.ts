export const SIMPLER_API_BASE = process.env.SIMPLER_API_BASE || "https://api.simpler.grants.gov"

export async function getOpportunityDetail(opportunityId: string) {
  const apiKey = process.env.SIMPLER_API_KEY
  if (!apiKey) {
    throw new Error("SIMPLER_API_KEY not set")
  }
  const res = await fetch(`${SIMPLER_API_BASE}/v1/opportunities/${opportunityId}`, {
    method: "GET",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json"
    },
    cache: "no-store"
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Simpler API error: ${res.status} ${text}`)
  }
  return res.json()
}
