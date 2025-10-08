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
    status: overWord || overPage ? "overflow" : "ok",
  }
}

function computeFixSuggestions(coverage) {
  return coverage.requirements
    .filter(req => req.status === "missing" || req.status === "stubbed")
    .map(req => {
      const weight = req.weight ?? 1
      const statusWeight = req.status === "missing" ? 1 : 0.5
      const value = weight * statusWeight
      const effort = req.status === "missing" ? 0.6 : 0.4
      const ratio = effort > 0 ? value / effort : value
      return {
        id: `fix-${req.id}`,
        requirementId: req.id,
        action: "draft",
        label: `Resolve ${req.id}`,
        value_score: value,
        effort_score: effort,
        ratio,
      }
    })
    .sort((a, b) => b.ratio - a.ratio)
}

function main() {
  const sampleText = Array(800).fill("word").join(" ")
  const overflow = simulateCompliance(sampleText, { hard_word_limit: 400, soft_page_limit: 1 })
  if (overflow.status !== "overflow") throw new Error("Compliance overflow expected")
  const ok = simulateCompliance(sampleText.slice(0, 2000), { hard_word_limit: 800, soft_page_limit: 4 })
  if (ok.status !== "ok") throw new Error("Compliance should be ok")

  const coverage = {
    score: 0,
    requirements: [
      { id: "narrative", status: "missing", weight: 0.5 },
      { id: "budget", status: "stubbed", weight: 0.5 },
    ],
  }
  const suggestions = computeFixSuggestions(coverage)
  const ratios = suggestions.map(s => s.ratio)
  for (let i = 1; i < ratios.length; i++) {
    if (ratios[i] > ratios[i - 1] + 1e-3) throw new Error("Suggestions not sorted by ratio")
  }
  let drafted = coverage.score
  const requirements = coverage.requirements.map(req => ({ ...req }))
  suggestions.forEach(s => {
    const target = requirements.find(req => req.id === s.requirementId)
    if (target) target.status = "drafted"
    const nextScore = requirements.filter(req => req.status === "drafted").length / requirements.length
    if (nextScore + 1e-6 < drafted) throw new Error("Coverage decreased after suggestion")
    drafted = nextScore
  })
  console.log("UX2 verification checks completed successfully")
}

main()
