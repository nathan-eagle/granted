import blueprintNSF, { type BlueprintSection } from "./nsf_sbir"
import { bestMatch } from "./similarity"
import { prisma } from "../prisma"
import { client as openaiClient, fastModel } from "../ai"

export type BlueprintLike = {
  slug?: string
  sections: BlueprintSection[]
}

const BLUEPRINTS: Record<string, BlueprintLike> = {
  nsf_sbir: blueprintNSF,
  "nsf-sbir": blueprintNSF,
  "nsf-sbir-phase-i": blueprintNSF,
}

async function loadBlueprint(blueprintId: string): Promise<BlueprintLike> {
  const blueprint = BLUEPRINTS[blueprintId as keyof typeof BLUEPRINTS]
  if (blueprint) return blueprint
  throw new Error(`Blueprint not found: ${blueprintId}`)
}

async function classifyWithLLM(requirementText: string, sections: BlueprintSection[]) {
  if (!process.env.OPENAI_API_KEY) return ""
  if ((process.env.OPENAI_MODE || "live") === "mock") return ""
  try {
    const allowed = sections.map(section => section.key).join(", ")
    const system = "You map funding requirements to a grant blueprint section key. Reply with ONLY the key from the allowed list."
    const user = `Allowed keys: ${allowed}\n\nRequirement:\n${requirementText}\n\nReturn only one key.`
    const response: any = await openaiClient.responses.create({
      model: fastModel,
      input: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    } as any)
    const key = String(response?.output_text || "").trim()
    if (sections.find(section => section.key === key)) {
      return key
    }
  } catch (error) {
    console.warn("LLM classification failed", error)
  }
  return ""
}

function coerceJson(value: unknown) {
  if (!value || typeof value !== "object") return {}
  return value as Record<string, any>
}

export async function mapRequirementsToBlueprint({
  projectId,
  rfpId,
  blueprintId
}: {
  projectId: string
  rfpId: string
  blueprintId: string
}) {
  const blueprint = await loadBlueprint(blueprintId)
  const requirements = await prisma.requirement.findMany({
    where: { rfpId },
    orderBy: [{ title: "asc" }, { id: "asc" }]
  })

  if (!requirements.length) {
    return { count: 0, mappings: [] as any[] }
  }

  const sections = await prisma.section.findMany({
    where: { projectId },
    orderBy: { order: "asc" }
  })
  const byId = new Map(sections.map(section => [section.id, section]))
  const byKey = new Map(sections.map(section => [section.key, section]))
  let maxOrder = sections.reduce((acc, section) => Math.max(acc, section.order ?? 0), -1)

  const mappings: { requirementId: string; sectionId: string; key: string }[] = []

  for (const requirement of requirements) {
    const blueprintSections = blueprint.sections
    const requirementText = `${requirement.title}\n\n${requirement.instructions ?? ""}`.trim()
    let key = await classifyWithLLM(requirementText, blueprintSections)
    if (!key) {
      const match = bestMatch(requirementText, blueprintSections.map(section => ({ key: section.key, title: section.title })))
      key = match.key
    }
    if (!key) {
      key = blueprintSections[0]?.key || "unmapped"
    }

    const blueprintMeta = blueprintSections.find(section => section.key === key)
    let section = byKey.get(key)
    if (!section) {
      maxOrder += 1
      section = await prisma.section.create({
        data: {
          projectId,
          key,
          title: blueprintMeta?.title || key,
          order: maxOrder,
          limitWords: blueprintMeta?.targetWords ?? null,
          contentJson: {
            key,
            targetWords: blueprintMeta?.targetWords ?? null,
            promptTemplate: blueprintMeta?.promptTemplate ?? "",
            requirements: []
          }
        } as any
      })
      byKey.set(section.key, section)
      byId.set(section.id, section)
    }

    const currentJson = coerceJson(section.contentJson)
    const requirementList: any[] = Array.isArray(currentJson.requirements) ? [...currentJson.requirements] : []
    if (!requirementList.some(item => item?.requirementId === requirement.id)) {
      requirementList.push({
        requirementId: requirement.id,
        title: requirement.title,
        excerpt: (requirement.instructions || "").slice(0, 500)
      })
    }

    const nextJson = {
      ...currentJson,
      key,
      promptTemplate: currentJson.promptTemplate ?? blueprintMeta?.promptTemplate ?? "",
      targetWords: blueprintMeta?.targetWords ?? currentJson.targetWords ?? null,
      requirements: requirementList
    }

    const updateData: any = {
      contentJson: nextJson,
      limitWords: blueprintMeta?.targetWords ?? section.limitWords ?? null
    }
    if (section.title !== (blueprintMeta?.title || section.title)) {
      updateData.title = blueprintMeta?.title || section.title
    }
    if (section.key !== key) {
      updateData.key = key
    }

    if (Object.keys(updateData).length) {
      section = await prisma.section.update({ where: { id: section.id }, data: updateData })
      byKey.set(section.key, section)
      byId.set(section.id, section)
    }

    mappings.push({ requirementId: requirement.id, sectionId: section.id, key })
  }

  return { count: mappings.length, mappings }
}
