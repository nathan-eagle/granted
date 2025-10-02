export type Search2Params = {
  rows?: number
  keyword?: string
  oppNum?: string
  eligibilities?: string
  agencies?: string
  oppStatuses?: string
  aln?: string
  fundingCategories?: string
}

export const GRANTS_API_BASE = process.env.GRANTS_API_BASE || "https://api.grants.gov/v1/api"

const SEARCH2_URL = `${GRANTS_API_BASE}/search2`

export async function searchOpportunities(params: Search2Params) {
  const res = await fetch(SEARCH2_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows: 10, oppStatuses: "posted", ...params })
  })
  if (!res.ok) throw new Error("grants.gov search2 failed: " + res.status)
  return res.json()
}

export async function fetchOpportunity(opportunityId: number) {
  const url = `${GRANTS_API_BASE}/fetchOpportunity`
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ opportunityId })
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`fetchOpportunity failed: ${res.status} ${text}`)
  }
  const json = await res.json().catch(() => ({}))
  return json?.data
}
