import pdf from "pdf-parse"

export async function extractTextFromPdf(buffer: ArrayBuffer) {
  const data = await pdf(Buffer.from(buffer))
  return data.text || ""
}

export function naiveRequirementExtraction(text: string) {
  // Heuristic: capture lines that look like headings and common grant words
  const lines = text.split(/\r?\n/)
  const reqs: { key: string; title: string; instructions?: string; targetWords?: number }[] = []
  const seen = new Set<string>()
  for (let i=0;i<lines.length;i++) {
    const line = lines[i].trim()
    if (!line) continue
    const isHeading = /^[A-Z][A-Za-z0-9\-\s]{3,}$/.test(line) && (line.endsWith(":") || line.split(" ").length <= 8)
    const keyHint = line.toLowerCase().includes("project description") || line.toLowerCase().includes("specific aims") || line.toLowerCase().includes("budget") || line.toLowerCase().includes("commercialization")
    if (isHeading || keyHint) {
      const title = line.replace(/:$/, "")
      if (!seen.has(title) && title.length < 120) {
        seen.add(title)
        reqs.push({ key: title.toLowerCase().replace(/\s+/g,"_").slice(0,50), title, instructions: gatherParagraph(lines, i+1, 8) })
      }
    }
  }
  return reqs.slice(0, 25)
}

function gatherParagraph(lines: string[], start: number, maxLines: number) {
  const picked: string[] = []
  for (let j=start; j<Math.min(lines.length, start+maxLines); j++) {
    const l = lines[j].trim()
    if (!l) break
    if (/^[A-Z][A-Za-z0-9\-\s]{3,}$/.test(l) && (l.endsWith(":") || l.split(" ").length <= 8)) break
    picked.push(l)
  }
  return picked.join(" ")
}
