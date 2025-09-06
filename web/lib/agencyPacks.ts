import fs from 'fs'
import path from 'path'

export type AgencyPack = {
  id: string
  name: string
  sections: { id: string; title: string; limitWords?: number; mustCover?: string[] }[]
  rubric?: { id: string; name: string; weight: number }[]
}

export function loadPackByFile(file: string): AgencyPack | null {
  try {
    const p = path.join(process.cwd(), 'lib/agencyPacks', file)
    const raw = fs.readFileSync(p, 'utf8')
    return JSON.parse(raw)
  } catch (e) {
    return null
  }
}

export async function loadPackForProject(project: { agencyPackId: string | null }): Promise<AgencyPack | null> {
  if (!project.agencyPackId) return null
  return loadPackByFile(project.agencyPackId)
}

