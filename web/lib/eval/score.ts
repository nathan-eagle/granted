export type SectionEval = {
  sectionId: string
  title: string
  words: number
  withinLimit?: boolean
  flesch?: number
}

export type Scorecard = {
  projectId: string
  totalWords: number
  sections: SectionEval[]
  compliance: {
    sectionsWithContent: number
    sectionsTotal: number
  }
}

export function fleschReadingEase(text: string) {
  // Rough approximation without heavy libs: syllables ~ vowels clusters
  const words = (text.match(/\b[\w'-]+\b/g) || []).length
  const sentences = (text.match(/[.!?]+/g) || []).length || 1
  const syllables = (text.match(/[aeiouy]+/gi) || []).length || Math.max(1, Math.round(words * 1.5))
  const ASL = words / sentences
  const ASW = syllables / words
  return Math.max(0, Math.min(100, 206.835 - (1.015 * ASL) - (84.6 * ASW)))
}
