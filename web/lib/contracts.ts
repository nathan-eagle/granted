import { z } from "zod"

const provenanceSchema = z.object({
  source_upload_id: z.string(),
  version: z.string().optional(),
  release_date: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
})

const eligibilitySchema = z.object({
  id: z.string(),
  text: z.string(),
  fatal: z.boolean().optional(),
  confidence: z.number().min(0).max(1).optional(),
  provenance: provenanceSchema.optional(),
})

const submissionLimitSchema = z.object({
  doc: z.string(),
  limit: z.number(),
  unit: z.enum(["pages", "words"]),
  provenance: provenanceSchema.optional(),
})

const attachmentSchema = z.object({
  key: z.string(),
  label: z.string(),
  required: z.boolean().optional(),
  formats: z.array(z.string()).optional(),
  notes: z.string().optional(),
  provenance: provenanceSchema.optional(),
})

const submissionSchema = z.object({
  portal: z.string().optional(),
  format: z.array(z.string()).optional(),
  font: z.string().optional(),
  font_size_pt: z.number().optional(),
  line_spacing: z.string().optional(),
  margins_in: z.number().optional(),
  page_limits: z.array(submissionLimitSchema).optional(),
  attachments: z.array(attachmentSchema).optional(),
  provenance: provenanceSchema.optional(),
})

const scoringSchema = z.object({
  criterion: z.string(),
  weight: z.number().optional(),
  notes: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  provenance: provenanceSchema.optional(),
})

const subsectionSchema = z.object({
  key: z.string(),
  title: z.string(),
  prompt: z.string().optional(),
  required: z.boolean().optional(),
  provenance: provenanceSchema.optional(),
})

const sectionSchema = z.object({
  key: z.string(),
  title: z.string(),
  prompt: z.string().optional(),
  required: z.boolean().optional(),
  word_limit: z.number().optional(),
  page_limit: z.number().optional(),
  ordering: z.number().optional(),
  subsections: z.array(subsectionSchema).optional(),
  provenance: provenanceSchema.optional(),
})

const faqSchema = z.object({
  q: z.string(),
  a: z.string(),
  provenance: provenanceSchema.optional(),
})

const citationSchema = z.object({
  label: z.string().optional(),
  url: z.string().optional(),
  excerpt: z.string().optional(),
  provenance: provenanceSchema.optional(),
})

export const RfpNormV1Schema = z.object({
  meta: z.object({
    title: z.string(),
    funder: z.string().optional(),
    program: z.string().optional(),
    release_date: z.string().optional(),
    deadline: z.string().optional(),
    deadline_tz: z.string().optional(),
    url: z.string().optional(),
    version: z.string().optional(),
  }),
  eligibility: z.array(eligibilitySchema).optional().default([]),
  submission: submissionSchema.optional(),
  scoring: z.array(scoringSchema).optional(),
  sections: z.array(sectionSchema),
  faq: z.array(faqSchema).optional(),
  citations: z.array(citationSchema).optional(),
})

const factEvidenceSchema = z.object({
  type: z.enum(["citation", "metric", "quote"]),
  value: z.string(),
  uploadId: z.string(),
  offsets: z.tuple([z.number(), z.number()]).optional(),
  provenance: provenanceSchema.optional(),
})

const factTeamMemberSchema = z.object({
  name: z.string(),
  role: z.string().optional(),
  highlights: z.array(z.string()).optional(),
  provenance: provenanceSchema.optional(),
})

export const FactsV1Schema = z.object({
  org: z
    .object({
      legal_name: z.string().optional(),
      mission: z.string().optional(),
      track_record: z.array(z.string()).optional(),
      ein: z.string().optional(),
      provenance: provenanceSchema.optional(),
    })
    .optional(),
  project: z
    .object({
      title: z.string().optional(),
      summary: z.string().optional(),
      milestones: z.array(z.string()).optional(),
      provenance: provenanceSchema.optional(),
    })
    .optional(),
  team: z.array(factTeamMemberSchema).optional(),
  evidence: z.array(factEvidenceSchema).optional(),
})

const coverageRequirementSchema = z.object({
  id: z.string(),
  source: z.string(),
  status: z.enum(["missing", "stubbed", "evidenced", "drafted"]),
  need_from_user: z.string().optional(),
  risk: z.enum(["low", "medium", "high"]).optional(),
  weight: z.number().optional(),
  evidence_rank: z.number().min(0).max(1).optional(),
  provenance: provenanceSchema.optional(),
})

const fixSuggestionSchema = z.object({
  id: z.string(),
  requirementId: z.string(),
  action: z.enum(["upload", "answer", "draft"]),
  label: z.string(),
  value_score: z.number(),
  effort_score: z.number(),
  ratio: z.number(),
})

export const CoverageV1Schema = z.object({
  score: z.number(),
  requirements: z.array(coverageRequirementSchema),
  suggestions: z.array(fixSuggestionSchema).optional(),
})

const paragraphMetaSchema = z.object({
  requirement_path: z.string(),
  sources: z
    .array(
      z.object({
        uploadId: z.string(),
        quote: z.string().optional(),
      })
    )
    .optional(),
  assumption: z.boolean().optional(),
})

export const SectionDraftV1Schema = z.object({
  section_key: z.string(),
  slot_fills: z.record(
    z.object({
      text: z.string(),
      sources: z
        .array(
          z.object({
            uploadId: z.string(),
            quote: z.string().optional(),
          })
        )
        .optional(),
    })
  ),
  full_markdown: z.string(),
  paragraph_meta: z.array(paragraphMetaSchema).optional(),
})

export type RfpNormV1 = z.infer<typeof RfpNormV1Schema>
export type FactsV1 = z.infer<typeof FactsV1Schema>
export type CoverageV1 = z.infer<typeof CoverageV1Schema>
export type SectionDraftV1 = z.infer<typeof SectionDraftV1Schema>

export const ProvenanceSchema = provenanceSchema
