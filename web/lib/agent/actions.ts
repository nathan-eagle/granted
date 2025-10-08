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
import { computeFixSuggestions } from "./fixNext"
import { slotsForSection } from "./slotLibrary"
import { Document, Packer, Paragraph, HeadingLevel, Media } from "docx"

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
  const uploadIds: string[] = []

  const bundleMeta: JsonArray = []

  if (files.length) {
    for (const file of files) {
      if (file.uploadId) {
        const exists = await prisma.upload.findUnique({
          where: { id: file.uploadId },
          select: { id: true, filename: true, kindDetail: true },
        })
        if (exists) {
          uploadIds.push(file.uploadId)
          bundleMeta.push({
            uploadId: exists.id,
            name: exists.filename ?? exists.id,
            version: detectVersion(exists.filename),
            release_date: detectReleaseDate(exists.filename),
            source: "existing",
            addedAt: new Date().toISOString(),
            kind: exists.kindDetail,
          })
          continue
        }
      }

      if (file.path) {
        const buffer = await fs.readFile(file.path)
        const text = buffer.toString("utf8")
        const detectedVersion = detectVersion(file.name ?? file.path)
        const detectedDate = detectReleaseDate(file.name ?? file.path)
        const created = await prisma.upload.create({
          data: {
            projectId,
            kind: "rfp",
            kindDetail: detectKindDetail(file.name),
            filename: file.name ?? file.path.split("/").pop() ?? "rfp_document",
            text,
          },
        })
        uploadIds.push(created.id)
        bundleMeta.push({
          uploadId: created.id,
          name: file.name ?? created.id,
          version: detectedVersion,
          release_date: detectedDate,
          source: "file",
          addedAt: new Date().toISOString(),
        })
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
        bundleMeta.push({
          uploadId: created.id,
          name: url,
          version: detectedVersion,
          release_date: detectedDate,
          source: "url",
          addedAt: new Date().toISOString(),
        })
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

  const mergedMeta: JsonArray = [...persistedMeta, ...bundleMeta]
  const deduped: JsonArray = []
  const seen = new Set<string>()
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

  await prisma.project.update({
    where: { id: projectId },
    data: { rfpBundleMeta: deduped },
  })

  return { uploadIds }
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

    const formatLimits = sectionData.word_limit || sectionData.page_limit
      ? {
          word_limit: sectionData.word_limit,
          page_limit: sectionData.page_limit,
          provenance: sectionData.provenance,
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
    const compliance = (section.formatLimits as any)?.result
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

  const markdown = [`## ${section.title}`, ...paragraphs].join("\n\n")

  await prisma.section.update({
    where: { id: section.id },
    data: { contentMd: markdown, slotsJson: slot_fills as Prisma.InputJsonValue },
  })

  const draft: SectionDraftV1 = SectionDraftV1Schema.parse({
    section_key,
    slot_fills,
    full_markdown: markdown,
    paragraph_meta: slots.map(slot => ({
      requirement_path: `sections.${section_key}.${slot.key}`,
      assumption: true,
    })),
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
    select: { id: true, contentMd: true },
  })

  if (!section) throw new Error(`Section ${section_key} not found`)

  let markdown = section.contentMd ?? ""
  if (simulator?.hard_word_limit) {
    const words = markdown.split(/\s+/)
    if (words.length > simulator.hard_word_limit) {
      markdown = words.slice(0, simulator.hard_word_limit).join(" ")
    }
  }

  const compliance = simulateCompliance(markdown, simulator)

  await prisma.section.update({
    where: { id: section.id },
    data: {
      contentMd: markdown,
      formatLimits: {
        ...(simulator ?? {}),
        result: compliance,
      } as Prisma.InputJsonValue,
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
      sections: { select: { title: true, contentMd: true }, orderBy: { order: "asc" } },
    },
  })

  if (!project) throw new Error("project not found")

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: project.name, heading: HeadingLevel.TITLE }),
          new Paragraph({ text: `Generated ${new Date().toLocaleString()}` }),
          new Paragraph({
            text: "Coverage Score: " + String((project.coverageJson as any)?.score ?? "n/a"),
          }),
          new Paragraph({ text: "Eligibility Summary:" }),
          new Paragraph({ text: JSON.stringify(project.eligibilityJson ?? {}, null, 2) }),
          ...project.sections.flatMap(section => [
            new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_1 }),
            new Paragraph({ text: section.contentMd ?? "" }),
          ]),
        ],
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
