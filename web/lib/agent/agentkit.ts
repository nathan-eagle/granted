import { z } from "zod"

import {
  CoverageV1Schema,
  FactsV1Schema,
  RfpNormV1Schema,
  SectionDraftV1Schema,
} from "../contracts"

export type AgentActionDefinition = {
  name: string
  description: string
  input: z.ZodTypeAny
  output: z.ZodTypeAny
}

export const ingestRfpBundleAction: AgentActionDefinition = {
  name: "ingest_rfp_bundle",
  description: "Ingest a set of RFP files and/or URLs and return upload identifiers for downstream processing.",
  input: z.object({
    projectId: z.string(),
    files: z
      .array(
        z.object({
          uploadId: z.string().optional(),
          path: z.string().optional(),
          name: z.string().optional(),
        })
      )
      .optional(),
    urls: z.array(z.string().url()).optional(),
  }),
  output: z.object({
    uploadIds: z.array(z.string()),
  }),
}

export const normalizeRfpAction: AgentActionDefinition = {
  name: "normalize_rfp",
  description: "Normalize previously ingested RFP materials into the canonical RFP-NORM v1 schema.",
  input: z.object({
    projectId: z.string(),
    uploadIds: z.array(z.string()),
  }),
  output: RfpNormV1Schema,
}

export const mineFactsAction: AgentActionDefinition = {
  name: "mine_facts",
  description: "Mine organizational and project facts from the provided uploads.",
  input: z.object({
    projectId: z.string(),
    uploadIds: z.array(z.string()),
  }),
  output: FactsV1Schema,
}

export const scoreCoverageAction: AgentActionDefinition = {
  name: "score_coverage",
  description: "Compute deterministic coverage for the current project state.",
  input: z.object({
    projectId: z.string(),
  }),
  output: CoverageV1Schema,
}

export const draftSectionAction: AgentActionDefinition = {
  name: "draft_section",
  description: "Draft a specific section using slot-based prompting and return text with citations.",
  input: z.object({
    projectId: z.string(),
    section_key: z.string(),
  }),
  output: SectionDraftV1Schema,
}

export const tightenSectionAction: AgentActionDefinition = {
  name: "tighten_section",
  description: "Tighten a drafted section to satisfy formatting limits from the compliance simulator.",
  input: z.object({
    projectId: z.string(),
    section_key: z.string(),
    simulator: z
      .object({
        font: z.string().optional(),
        size: z.number().optional(),
        spacing: z.string().optional(),
        margins: z.number().optional(),
        hard_word_limit: z.number().optional(),
        soft_page_limit: z.number().optional(),
      })
      .optional(),
  }),
  output: z.object({
    markdown: z.string(),
    compliance: z.object({
      wordCount: z.number(),
      estimatedPages: z.number(),
      status: z.enum(["ok", "overflow"]),
    }),
  }),
}

export const exportDocxAction: AgentActionDefinition = {
  name: "export_docx",
  description: "Export the current project into a formatted DOCX file.",
  input: z.object({
    projectId: z.string(),
  }),
  output: z.object({
    fileUrl: z.string().url(),
  }),
}

export const agentActions: AgentActionDefinition[] = [
  ingestRfpBundleAction,
  normalizeRfpAction,
  mineFactsAction,
  scoreCoverageAction,
  draftSectionAction,
  tightenSectionAction,
  exportDocxAction,
]

export const AgentStateSchema = z.object({
  projectId: z.string(),
  rfpNorm: RfpNormV1Schema.optional(),
  facts: FactsV1Schema.optional(),
  coverage: CoverageV1Schema.optional(),
  conflicts: z.array(z.record(z.string(), z.unknown())).optional(),
  eligibility: z.record(z.string(), z.unknown()).optional(),
  formatLimits: z.record(z.string(), z.unknown()).optional(),
})

export type AgentState = z.infer<typeof AgentStateSchema>
