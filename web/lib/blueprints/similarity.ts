export function normalize(input: string) {
  return (input || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function jaccard(a: string, b: string) {
  const normA = normalize(a)
  const normB = normalize(b)
  if (!normA.length || !normB.length) return 0
  const setA = new Set(normA.split(" ").filter(Boolean))
  const setB = new Set(normB.split(" ").filter(Boolean))
  const intersectionSize = [...setA].filter(token => setB.has(token)).length
  const unionSize = new Set([...setA, ...setB]).size
  return unionSize === 0 ? 0 : intersectionSize / unionSize
}

export function bestMatch(target: string, candidates: { key: string; title: string }[]) {
  if (!candidates.length) return { key: "", score: 0 }
  let best = { key: candidates[0].key, score: -1 }
  for (const candidate of candidates) {
    const byTitle = jaccard(target, candidate.title)
    const byKey = jaccard(target, candidate.key.replace(/_/g, " "))
    const score = Math.max(byTitle, byKey)
    if (score > best.score) {
      best = { key: candidate.key, score }
    }
  }
  return best
}
