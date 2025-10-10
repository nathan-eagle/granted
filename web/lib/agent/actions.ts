import { promises as fs } from "fs"
import { Prisma } from "@prisma/client"

import { prisma } from "../prisma"
import { naiveRequirementExtraction } from "../rfp/parser"
import {
  CoverageV1,
  CoverageV1Schema,
  FactsV1,
  FactsV1Schema,
  RfpNormV1,
  RfpNormV1Schema,
  SectionDraftV1,
  SectionDraftV1Schema,
} from "../contracts"
import { simulateCompliance } from "../compliance/simulator"
import { emitAgentEvent } from "./events"
import "./event-subscribers"
import { registerKnowledgeBaseFile } from "./knowledgeBase"
import { loadConnectorRegistry, pickConnectorForFile } from "./connectors"
import { buildConflictKey, buildConflictTopic, upsertConflictLog } from "./conflicts"
import { computeFixSuggestions } from "./fixNext"
import { slotsForSection } from "./slotLibrary"
import { persistAgentState } from "./state"
import { Document, Packer, Paragraph, HeadingLevel } from "docx"
import { loadDraftSnapshot, SUMMARY_SECTION_KEY, SUMMARY_SECTION_TITLE } from "./draft"

type JsonArray = Prisma.JsonArray

const VERSION_REGEX = /v(?:ersion)?\s*(\d+(?:\.\d+)?)/i
const DATE_REGEX = /(20\d{2})[-_ ]?(\d{2})[-_ ]?(\d{2})/

function detectVersion(input?: string | null) {
  if (!input) return undefined
  const match = input.match(VERSION_REGEX)
  return match ? match[1] : undefined
}

function detectReleaseDate(input?: string | null) {
  if (!input) return undefined
  const match = input.match(DATE_REGEX)
  if (!match) return undefined
  const [, year, month, day] = match
  return `${year}-${month}-${day}`
}

function detectKindDetail(name?: string | null) {
  if (!name) return "bundle"
  const lower = name.toLowerCase()
  if (lower.includes("faq")) return "faq"
  if (lower.includes("addendum")) return "addendum"
  if (lower.includes("template")) return "template"
  return "bundle"
}

function naiveEligibilityExtraction(text: string) {
  const lines = text.split(/\r?\n/)
  const eligibility: { id: string; text: string; fatal?: boolean }[] = []
  lines.forEach((line, index) => {
    const value = line.trim()
    if (!value) return
    const lower = value.toLowerCase()
    if (lower.includes("must") && (lower.includes("501") || lower.includes("eligible"))) {
      eligibility.push({
        id: `elig-${index}`,
        text: value,
        fatal: true,
      })
    }
  })
  return eligibility
}

export type IngestRfpBundleInput = {
  projectId: string
  files?: { uploadId?: string; path?: string; name?: string }[]
  urls?: string[]
}

export async function ingestRfpBundle({ projectId, files = [], urls = [] }: IngestRfpBundleInput) {
  const registry = loadConnectorRegistry()
  const uploadIds: string[] = []
  const bundleMeta: JsonArray = []
  const freshEntries: Record<string, unknown>[] = []

  const recordMeta = (entry: Record<string, unknown>) => {
    bundleMeta.push(entry as unknown as Prisma.JsonValue)
    freshEntries.push(entry)
  }

  if (files.length) {
    for (const file of files) {
      if (file.uploadId) {
        const exists = await prisma.upload.findUnique({
          where: { id: file.uploadId },
          select: { id: true, filename: true, kindDetail: true, text: true },
        })
        if (exists) {
          uploadIds.push(exists.id)
          const entry: Record<string, unknown> = {
            uploadId: exists.id,
            name: exists.filename ?? exists.id,
            version: detectVersion(exists.filename),
            release_date: detectReleaseDate(exists.filename),
            source: "existing",
            addedAt: new Date().toISOString(),
            kind: exists.kindDetail,
          }
          const knowledgeFile = await registerKnowledgeBaseFile({
            projectId,
            uploadId: exists.id,
            filename: exists.filename,
            text: exists.text,
            source: "existing",
            version: entry.version?.toString() ?? null,
            releaseDate: entry.release_date?.toString() ?? null,
            connectorOverride: pickConnectorForFile(registry, exists.filename ?? undefined),
          })
          entry.connector_id = knowledgeFile?.connectorId ?? null
          entry.vector_store_file_id = knowledgeFile?.vectorFileId ?? null
          entry.knowledge_base_file_id = knowledgeFile?.id ?? null
          recordMeta(entry)
          continue
        }
      }

      if (file.path) {
        const buffer = await fs.readFile(file.path)
        const text = buffer.toString("utf8")
        const fileName = file.name ?? file.path.split("/").pop() ?? "rfp_document"
        const detectedVersion = detectVersion(fileName)
        const detectedDate = detectReleaseDate(fileName)
        const created = await prisma.upload.create({
          data: {
            projectId,
            kind: "rfp",
            kindDetail: detectKindDetail(file.name),
            filename: fileName,
            text,
          },
        })
        uploadIds.push(created.id)
        const entry: Record<string, unknown> = {
          uploadId: created.id,
          name: fileName,
          version: detectedVersion,
          release_date: detectedDate,
          source: "file",
          addedAt: new Date().toISOString(),
          kind: detectKindDetail(file.name),
        }
        const knowledgeFile = await registerKnowledgeBaseFile({
          projectId,
          uploadId: created.id,
          filename: fileName,
          text,
          source: "file",
          version: detectedVersion,
          releaseDate: detectedDate,
          connectorOverride: pickConnectorForFile(registry, fileName),
        })
        entry.connector_id = knowledgeFile?.connectorId ?? null
        entry.vector_store_file_id = knowledgeFile?.vectorFileId ?? null
        entry.knowledge_base_file_id = knowledgeFile?.id ?? null
        recordMeta(entry)
      }
    }
  }

  if (urls.length) {
    for (const url of urls) {
      try {
        const response = await fetch(url)
        const text = await response.text()
        const detectedVersion = detectVersion(url)
        const detectedDate = detectReleaseDate(url)
        const created = await prisma.upload.create({
          data: {
            projectId,
            kind: "rfp",
            kindDetail: "url",
            filename: url,
            url,
            text,
          },
        })
        uploadIds.push(created.id)
        const entry: Record<string, unknown> = {
          uploadId: created.id,
          name: url,
          version: detectedVersion,
          release_date: detectedDate,
          source: "url",
          addedAt: new Date().toISOString(),
          kind: "url",
        }
        const knowledgeFile = await registerKnowledgeBaseFile({
          projectId,
          uploadId: created.id,
          filename: url,
          text,
          source: "url",
          version: detectedVersion,
          releaseDate: detectedDate,
          connectorOverride: pickConnectorForFile(registry, "remote.html"),
        })
        entry.connector_id = knowledgeFile?.connectorId ?? null
        entry.vector_store_file_id = knowledgeFile?.vectorFileId ?? null
        entry.knowledge_base_file_id = knowledgeFile?.id ?? null
        recordMeta(entry)
      } catch (error) {
        console.warn("Failed to fetch RFP URL", { url, error })
      }
    }
  }

  const existingBundle = await prisma.project.findUnique({
    where: { id: projectId },
    select: { rfpBundleMeta: true },
  })

  const persistedMeta: JsonArray = Array.isArray(existingBundle?.rfpBundleMeta)
    ? (existingBundle?.rfpBundleMeta as JsonArray)
    : []

  const conflictTopics = new Map<string, Record<string, unknown>>()
  persistedMeta.forEach(entry => {
    if (!entry || typeof entry !== "object") return
    const typed = entry as Record<string, unknown>
    const topic = buildConflictTopic(typed as any)
    if (!conflictTopics.has(topic)) {
      conflictTopics.set(topic, typed)
    }
  })

  for (const entry of freshEntries) {
    const topic = buildConflictTopic(entry as any)
    const previous = conflictTopics.get(topic)
    if (previous) {
      const key = buildConflictKey({
        ...entry,
        kind: entry.kind ?? previous.kind ?? "bundle",
      } as any)
      await upsertConflictLog({
        projectId,
        key,
        previous: previous as Record<string, unknown>,
        next: entry,
      })
      emitAgentEvent({
        type: "conflict.found",
        payload: {
          projectId,
          key,
          previous: previous as Record<string, unknown>,
          next: entry,
        },
      })
    }
  }

  const mergedMeta: JsonArray = [...persistedMeta, ...bundleMeta]
  const seen = new Set<string>()
  const deduped: JsonArray = []
  for (const entry of mergedMeta) {
    if (!entry || typeof entry !== "object" || !("uploadId" in entry)) {
      deduped.push(entry)
      continue
    }
    const uploadId = String((entry as Record<string, unknown>).uploadId)
    if (seen.has(uploadId)) continue
    seen.add(uploadId)
    deduped.push(entry)
  }

  deduped.sort((a, b) => compareBundleEntries(a as Record<string, unknown>, b as Record<string, unknown>))

  await prisma.project.update({
    where: { id: projectId },
    data: { rfpBundleMeta: deduped },
  })

  return { uploadIds }
}

function compareBundleEntries(a: Record<string, unknown>, b: Record<string, unknown>) {
  const getDate = (entry: Record<string, unknown>) => {
    const value = typeof entry.release_date === "string" ? entry.release_date : undefined
    return value ? Date.parse(value) : NaN
  }

  const dateA = getDate(a)
  const dateB = getDate(b)
  if (!Number.isNaN(dateA) && !Number.isNaN(dateB) && dateA !== dateB) {
    return dateB - dateA
  }

  const versionA = typeof a.version === "string" ? a.version : ""
  const versionB = typeof b.version === "string" ? b.version : ""
  if (versionA && versionB && versionA !== versionB) {
    return versionB.localeCompare(versionA, undefined, { numeric: true, sensitivity: "base" })
  }

  const nameA = typeof a.name === "string" ? a.name : ""
  const nameB = typeof b.name === "string" ? b.name : ""
  return nameA.localeCompare(nameB)
}

export type NormalizeRfpInput = {
  projectId: string
  uploadIds: string[]
}

export async function normalizeRfp({ projectId, uploadIds }: NormalizeRfpInput) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { rfpBundleMeta: true },
  })

  const metaEntries = Array.isArray(project?.rfpBundleMeta)
    ? (project?.rfpBundleMeta as JsonArray)
    : []

  const metaByUpload = new Map<string, Record<string, any>>()
  for (const entry of metaEntries) {
    if (entry && typeof entry === "object" && "uploadId" in entry) {
      metaByUpload.set(String(entry.uploadId), entry as Record<string, any>)
    }
  }

  const uploads = await prisma.upload.findMany({
    where: { id: { in: uploadIds } },
    select: { id: true, text: true },
  })

  const orderedUploads = [...uploads].sort((a, b) => {
    const metaA = metaByUpload.get(a.id)
    const metaB = metaByUpload.get(b.id)
    const versionA = metaA?.version ? Number(metaA.version) : undefined
    const versionB = metaB?.version ? Number(metaB.version) : undefined
    if (versionA !== undefined && versionB !== undefined && versionA !== versionB) {
      return versionA - versionB
    }
    const dateA = metaA?.release_date ? Date.parse(metaA.release_date) : undefined
    const dateB = metaB?.release_date ? Date.parse(metaB.release_date) : undefined
    if (dateA && dateB && dateA !== dateB) {
      return dateA - dateB
    }
    const addedA = metaA?.addedAt ? Date.parse(metaA.addedAt) : 0
    const addedB = metaB?.addedAt ? Date.parse(metaB.addedAt) : 0
    return addedA - addedB
  })

  const aggregateText = orderedUploads.map(u => u.text ?? "").join("\n\n")

  const sectionsMap = new Map<string, { section: any; provenance: Record<string, any> }>()
  const conflicts: Record<string, any>[] = []

  orderedUploads.forEach(upload => {
    const meta = metaByUpload.get(upload.id) ?? {}
    const text = upload.text ?? ""
    const extracted = naiveRequirementExtraction(text)
    extracted.forEach(extractedSection => {
      const key = extractedSection.key
      const existing = sectionsMap.get(key)
      const provenance = {
        source_upload_id: upload.id,
        version: meta.version,
        release_date: meta.release_date,
      }
      const candidate = {
        key,
        title: extractedSection.title,
        prompt: extractedSection.instructions ?? "",
        required: true,
        provenance,
      }
      if (existing && existing.section.prompt !== candidate.prompt) {
        const conflict = {
          type: "section_conflict",
          key,
          previous: existing.provenance,
          next: provenance,
        }
        conflicts.push(conflict)
        emitAgentEvent({ type: "conflict.found", payload: { projectId, key, previous: conflict.previous, next: conflict.next } })
      }
      sectionsMap.set(key, { section: candidate, provenance })
    })
  })

  const sections = Array.from(sectionsMap.values()).map(entry => entry.section)

  const eligibility = naiveEligibilityExtraction(aggregateText)

  const rfpNorm: RfpNormV1 = RfpNormV1Schema.parse({
    meta: { title: sections[0]?.title ?? "Untitled RFP" },
    sections,
    eligibility,
  })

  const supersededUploads = new Set<string>()
  orderedUploads.forEach((upload, index) => {
    if (index < orderedUploads.length - 1) supersededUploads.add(upload.id)
  })

  const updatedMeta: JsonArray = metaEntries.map(entry => {
    if (!entry || typeof entry !== "object" || !("uploadId" in entry)) return entry
    return {
      ...entry,
      superseded: supersededUploads.has(String(entry.uploadId)) || entry.superseded === true,
    }
  })

  for (const [index, sectionData] of sections.entries()) {
    const existing = await prisma.section.findFirst({
      where: { projectId, key: sectionData.key },
      select: { id: true },
    })

    const formatSettings = {
      hard_word_limit: sectionData.word_limit ?? undefined,
      soft_page_limit: sectionData.page_limit ?? undefined,
      font: sectionData.provenance?.font,
      size: sectionData.provenance?.font_size_pt,
      spacing: sectionData.provenance?.line_spacing,
      margins: sectionData.provenance?.margins_in,
      provenance: sectionData.provenance ?? undefined,
    }
    const hasSettings =
      formatSettings.hard_word_limit !== undefined || formatSettings.soft_page_limit !== undefined
    const formatLimits = hasSettings
      ? {
          settings: formatSettings,
          result: null,
          updatedAt: new Date().toISOString(),
        }
      : undefined

    if (existing) {
      await prisma.section.update({
        where: { id: existing.id },
        data: {
          title: sectionData.title,
          order: index,
          formatLimits: formatLimits as Prisma.InputJsonValue,
        },
      })
    } else {
      await prisma.section.create({
        data: {
          projectId,
          key: sectionData.key,
          title: sectionData.title,
          order: index,
          formatLimits: formatLimits as Prisma.InputJsonValue,
        },
      })
    }
  }

  await prisma.project.update({
    where: { id: projectId },
    data: {
      rfpNormJson: rfpNorm,
      conflictLogJson: conflicts,
      eligibilityJson: eligibility.length ? { items: eligibility } : undefined,
      rfpBundleMeta: updatedMeta,
    },
  })

  eligibility.forEach(item => {
    emitAgentEvent({ type: "eligibility.flag", payload: { projectId, item } })
  })

  await persistAgentState({
    projectId,
    rfpNorm,
    eligibility: { items: eligibility },
  })

  return rfpNorm
}

export type MineFactsInput = {
  projectId: string
  uploadIds: string[]
}

export async function mineFacts({ projectId }: MineFactsInput) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { name: true, meta: true },
  })

  const facts: FactsV1 = FactsV1Schema.parse({
    project: { title: project?.name },
    org: project?.meta ? (project.meta as Record<string, unknown>) : undefined,
  })

  await prisma.project.update({ where: { id: projectId }, data: { factsJson: facts } })

  return facts
}

export type ScoreCoverageInput = {
  projectId: string
}

export async function scoreCoverage({ projectId }: ScoreCoverageInput) {
  const sections = await prisma.section.findMany({
    where: { projectId },
    select: { key: true, title: true, contentMd: true, formatLimits: true },
    orderBy: { order: "asc" },
  })

  const weight = sections.length ? 1 / sections.length : 1
  const requirements = sections.map(section => {
    const status: "missing" | "stubbed" | "evidenced" | "drafted" = section.contentMd?.trim()
      ? "drafted"
      : "missing"
    const formatLimits = section.formatLimits as any
    const compliance = formatLimits?.result
    return {
      id: section.key,
      source: `sections.${section.key}`,
      status,
      weight,
      evidence_rank: section.formatLimits ? 1 : 0,
      risk: compliance?.status === "overflow" ? ("high" as const) : undefined,
      need_from_user: compliance?.status === "overflow" ? "Reduce content to meet limits" : undefined,
    }
  })

  const drafted = requirements.filter(r => r.status === "drafted").length
  const score = sections.length ? drafted / sections.length : 0

  const suggestions = computeFixSuggestions({ score, requirements })

  const coverage: CoverageV1 = CoverageV1Schema.parse({
    score,
    requirements,
    suggestions,
  })

  await prisma.project.update({ where: { id: projectId }, data: { coverageJson: coverage } })

  emitAgentEvent({ type: "coverage.delta", payload: { projectId, score: coverage.score } })

  return coverage
}

export type DraftSectionInput = {
  projectId: string
  section_key: string
}

export async function draftSection({ projectId, section_key }: DraftSectionInput) {
  emitAgentEvent({ type: "draft.progress", payload: { projectId, sectionKey: section_key, status: "started" } })
  const section = await prisma.section.findFirst({
    where: { projectId, key: section_key },
    select: { id: true, title: true },
  })

  if (!section) {
    throw new Error(`Section ${section_key} not found`)
  }

  const slots = slotsForSection(section_key)
  const slot_fills: SectionDraftV1["slot_fills"] = {}
  const paragraphs: string[] = []

  slots.forEach(slot => {
    const placeholder = `[{${slot.label}}] Add details here.`
    slot_fills[slot.key] = {
      text: placeholder,
      sources: [],
    }
    paragraphs.push(`### ${slot.label}\n\n${placeholder}`)
  })

  const paragraphMeta = slots.map(slot => ({
    requirement_path: `sections.${section_key}.${slot.key}`,
    assumption: true,
  }))

  const markdown = [`## ${section.title}`, ...paragraphs].join("\n\n")

  await prisma.section.update({
    where: { id: section.id },
    data: {
      contentMd: markdown,
      slotsJson: slot_fills as Prisma.InputJsonValue,
      contentJson: paragraphMeta as Prisma.InputJsonValue,
    },
  })

  const draft: SectionDraftV1 = SectionDraftV1Schema.parse({
    section_key,
    slot_fills,
    full_markdown: markdown,
    paragraph_meta: paragraphMeta,
  })

  emitAgentEvent({ type: "draft.progress", payload: { projectId, sectionKey: section_key, status: "completed" } })

  return draft
}

export type TightenSectionInput = {
  projectId: string
  section_key: string
  simulator?: {
    font?: string
    size?: number
    spacing?: string
    margins?: number
    hard_word_limit?: number
    soft_page_limit?: number
  }
}

export async function tightenSection({ projectId, section_key, simulator }: TightenSectionInput) {
  const section = await prisma.section.findFirst({
    where: { projectId, key: section_key },
    select: { id: true, contentMd: true, formatLimits: true },
  })

  if (!section) throw new Error(`Section ${section_key} not found`)

  const existingLimits = section.formatLimits as any
  const baseSettings = existingLimits?.settings ?? existingLimits ?? {}
  const tightenSettings = {
    ...baseSettings,
    ...(simulator ?? {}),
  }

  let markdown = section.contentMd ?? ""
  if (tightenSettings.hard_word_limit) {
    const words = markdown.split(/\s+/)
    if (words.length > tightenSettings.hard_word_limit) {
      markdown = words.slice(0, tightenSettings.hard_word_limit).join(" ")
    }
  }

  const compliance = simulateCompliance(markdown, tightenSettings)

  await prisma.section.update({
    where: { id: section.id },
    data: {
      contentMd: markdown,
      formatLimits: {
        settings: tightenSettings,
        result: compliance,
        updatedAt: new Date().toISOString(),
      } as Prisma.InputJsonValue,
    },
  })

  await persistAgentState({
    projectId,
    formatLimits: {
      [section_key]: {
        settings: tightenSettings,
        result: compliance,
      },
    },
  })

  emitAgentEvent({ type: "tighten.applied", payload: { projectId, sectionKey: section_key, status: compliance.status } })

  return { markdown, compliance }
}

export type ExportDocxInput = {
  projectId: string
}

export async function exportDocx({ projectId }: ExportDocxInput) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      name: true,
      coverageJson: true,
      eligibilityJson: true,
    },
  })

  if (!project) throw new Error("project not found")

  const draft = await loadDraftSnapshot(projectId)
  const coveragePercent =
    typeof draft.coverage === "number" && Number.isFinite(draft.coverage)
      ? `${Math.round(draft.coverage * 100)}%`
      : "n/a"

  const headerParagraphs: Paragraph[] = [
    new Paragraph({ text: project.name, heading: HeadingLevel.TITLE }),
    new Paragraph({ text: `Generated ${new Date().toLocaleString()}` }),
    new Paragraph({ text: `Coverage Score: ${coveragePercent}` }),
  ]

  if (project.eligibilityJson) {
    headerParagraphs.push(new Paragraph({ text: "Eligibility Summary", heading: HeadingLevel.HEADING_2 }))
    headerParagraphs.push(new Paragraph({ text: JSON.stringify(project.eligibilityJson, null, 2) }))
  }

  if (draft.coverageSuggestions?.length) {
    headerParagraphs.push(new Paragraph({ text: "Fix Next Suggestions", heading: HeadingLevel.HEADING_2 }))
    draft.coverageSuggestions.slice(0, 5).forEach(suggestion => {
      headerParagraphs.push(new Paragraph({ text: suggestion.label, bullet: { level: 0 } }))
    })
  }

  const sectionParagraphs: Paragraph[] = []
  for (const section of draft.sections) {
    const headingLevel = section.key === SUMMARY_SECTION_KEY ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2
    sectionParagraphs.push(new Paragraph({ text: section.title, heading: headingLevel }))
    markdownToParagraphs(section.markdown).forEach(paragraph => sectionParagraphs.push(paragraph))
    if (section.compliance) {
      sectionParagraphs.push(
        new Paragraph({
          text: `Compliance: ${section.compliance.status.toUpperCase()} — ${section.compliance.wordCount} words, ${section.compliance.estimatedPages.toFixed(2)} pages`,
        }),
      )
    }
    if (section.assumptions?.length) {
      sectionParagraphs.push(new Paragraph({ text: "Assumptions", heading: HeadingLevel.HEADING_3 }))
      section.assumptions.forEach(assumption => {
        sectionParagraphs.push(new Paragraph({ text: assumption, bullet: { level: 0 } }))
      })
    }
  }

  const doc = new Document({
    sections: [
      {
        children: [...headerParagraphs, ...sectionParagraphs],
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)
  const base64 = buffer.toString("base64")
  const dataUrl = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64}`

  await prisma.project.update({
    where: { id: projectId },
    data: { sloJson: { lastExportUrl: dataUrl, exportedAt: new Date().toISOString() } },
  })

  return { fileUrl: dataUrl }
}

function markdownToParagraphs(markdown: string): Paragraph[] {
  if (!markdown.trim()) return [new Paragraph({ text: "" })]
  return markdown
    .split(/\n{2,}/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => new Paragraph({ text: line }))
}
