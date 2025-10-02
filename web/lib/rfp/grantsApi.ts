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

const SEARCH2_URL = "https://api.grants.gov/v1/api/search2"

export async function searchOpportunities(params: Search2Params) {
  const res = await fetch(SEARCH2_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows: 10, oppStatuses: "posted", ...params })
  })
  if (!res.ok) throw new Error("grants.gov search2 failed: " + res.status)
  return res.json()
}
