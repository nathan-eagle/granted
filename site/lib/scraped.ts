import path from 'path'
import { promises as fs } from 'fs'

export type ScrapedBlock = { tag: string; length: number; text: string }
export type ScrapedPage = { title: string | null; description: string | null; url: string; blocks: ScrapedBlock[] }

export async function loadScraped(slug: string): Promise<ScrapedPage | null> {
  const file = path.join(process.cwd(), 'scraped', `${slug}.json`)
  try {
    const raw = await fs.readFile(file, 'utf8')
    return JSON.parse(raw) as ScrapedPage
  } catch {
    return null
  }
}

export function toParagraphs(scraped: ScrapedPage): string[] {
  const combined = scraped.blocks.map(b => b.text).join('\n\n')
  // Normalize whitespace and split on blank lines
  const parts = combined.replace(/\r\n/g,'\n').split(/\n\s*\n/).map(s => s.trim()).filter(Boolean)
  return parts
}

