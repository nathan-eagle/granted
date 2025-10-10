export type SimulatorOptions = {
  font?: string
  size?: number
  spacing?: string
  margins?: number
  hard_word_limit?: number
  soft_page_limit?: number
}

const DEFAULT_WORDS_PER_PAGE = 500

function spacingMultiplier(spacing?: string) {
  switch (spacing?.toLowerCase()) {
    case "double":
      return 0.5
    case "1.5":
    case "one-half":
      return 0.66
    case "single":
    default:
      return 1
  }
}

function sizeMultiplier(size?: number) {
  if (!size) return 1
  if (size <= 10) return 1.1
  if (size >= 12) return 0.9
  return 1
}

function marginMultiplier(margins?: number) {
  if (!margins) return 1
  if (margins >= 1.5) return 0.85
  if (margins <= 0.75) return 1.1
  return 1
}

export function estimateWordsPerPage(options: SimulatorOptions = {}) {
  return (
    DEFAULT_WORDS_PER_PAGE *
    spacingMultiplier(options.spacing) *
    sizeMultiplier(options.size) *
    marginMultiplier(options.margins)
  )
}

export function estimatePages(wordCount: number, options: SimulatorOptions = {}) {
  const wordsPerPage = Math.max(estimateWordsPerPage(options), 150)
  return wordCount / wordsPerPage
}

export type ComplianceResult = {
  wordCount: number
  estimatedPages: number
  status: "ok" | "overflow"
}

export function simulateCompliance(markdown: string, options?: SimulatorOptions | null): ComplianceResult {
  const normalized = options ?? {}
  const words = markdown.trim().split(/\s+/).filter(Boolean)
  const wordCount = words.length
  const estimatedPages = estimatePages(wordCount, normalized)
  const overWordLimit =
    normalized.hard_word_limit !== undefined && wordCount > normalized.hard_word_limit
  const overPageLimit =
    normalized.soft_page_limit !== undefined && estimatedPages > normalized.soft_page_limit

  const status: "ok" | "overflow" = overWordLimit || overPageLimit ? "overflow" : "ok"

  return {
    wordCount,
    estimatedPages,
    status,
  }
}
