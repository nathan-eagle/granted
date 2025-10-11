export interface TightenPreset {
  font: string;
  fontSizePt: number;
  spacing: "single" | "double";
  wordsPerPage: number;
}

export interface TightenResult {
  withinLimit: boolean;
  wordCount: number;
  pageEstimate: number;
}

export const DEFAULT_TIGHTEN_PRESET: TightenPreset = {
  font: "Times New Roman",
  fontSizePt: 12,
  spacing: "single",
  wordsPerPage: 550,
};

export function analyzeLength(markdown: string, limitWords?: number, preset: TightenPreset = DEFAULT_TIGHTEN_PRESET): TightenResult {
  const wordCount = markdown
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean).length;
  const pageEstimate = Math.max(1, Math.round(wordCount / preset.wordsPerPage));
  const limit = limitWords ?? preset.wordsPerPage;
  return {
    withinLimit: wordCount <= limit,
    wordCount,
    pageEstimate,
  };
}
