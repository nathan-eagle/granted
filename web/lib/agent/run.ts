import { PrismaClient } from "@prisma/client"
import { completeFromSources } from "../ai"
import { getDefaultUserId } from "../defaultUser"

const prisma = new PrismaClient()

export type AgentConfig = {
  keyword?: string
  modelSlug?: string // e.g., nsf-sbir-phase-i
  sources?: { filename: string; text: string }[]
  variables?: Record<string,string>
}

export async function agentRun(config: AgentConfig) {
  const run = await prisma.agentRun.create({ data: { status: "running", steps: [] } })
  const log = async (level: string, message: string, data?: any) => {
    await prisma.eventLog.create({ data: { agentRunId: run.id, level, message, data } })
  }
  try {
    // 1) Create a project
    const userId = await getDefaultUserId()
    const project = await prisma.project.create({
      data: { name: `Agent Project ${new Date().toISOString()}`, status: "drafting", userId },
    })
    await prisma.agentRun.update({ where: { id: run.id }, data: { projectId: project.id } })
    await log("info", "Created project", { projectId: project.id })

    // 2) Seed a single default section for demo purposes
    const section = await prisma.section.create({
      data: { projectId: project.id, key: "specific_aims", title: "Specific Aims", order: 0 },
    })
    await log("info", "Created section", { sectionId: section.id })

    // 3) Add sources (if provided)
    if (config.sources?.length) {
      for (const s of config.sources) {
        await prisma.upload.create({ data: { projectId: project.id, kind: "source", filename: s.filename, text: s.text } })
      }
      await log("info", "Added sources", { count: config.sources.length })
    }

    // 4) Draft content via model
    const sourcesText = (config.sources || []).map(s => `# ${s.filename}\n${s.text}`).join("\n\n")
    const output = await completeFromSources({ prompt: "Write a concise 'Specific Aims' section for an NSF SBIR Phase I proposal, 250-300 words, tailored to a novel product.", sourcesText })
    await prisma.section.update({ where: { id: section.id }, data: { contentHtml: `<p>${output}</p>`, wordCount: output.split(/\s+/).filter(Boolean).length } })
    await log("info", "Drafted section", { words: output.split(/\s+/).length })

    // 5) Finish
    await prisma.agentRun.update({ where: { id: run.id }, data: { status: "done" } })
    return run
  } catch (e:any) {
    await log("error", "Agent error", { error: e.message })
    await prisma.agentRun.update({ where: { id: run.id }, data: { status: "error" } })
    throw e
  }
}
