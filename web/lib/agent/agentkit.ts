import { z } from "zod"

import {
  CoverageV1Schema,
  FactsV1Schema,
  RfpNormV1Schema,
  SectionDraftV1Schema,
} from "../contracts"
import {
  draftSection,
  exportDocx,
  ingestRfpBundle,
  mineFacts,
  normalizeRfp,
  scoreCoverage,
  tightenSection,
} from "./actions"

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

const actionDefinitionMap = {
  ingest_rfp_bundle: ingestRfpBundleAction,
  normalize_rfp: normalizeRfpAction,
  mine_facts: mineFactsAction,
  score_coverage: scoreCoverageAction,
  draft_section: draftSectionAction,
  tighten_section: tightenSectionAction,
  export_docx: exportDocxAction,
} as const satisfies Record<string, AgentActionDefinition>

export type AgentActionName = keyof typeof actionDefinitionMap
export type AgentActionEntry<TName extends AgentActionName> = typeof actionDefinitionMap[TName]
export type AgentActionInput<TName extends AgentActionName> = z.input<AgentActionEntry<TName>["input"]>
export type AgentActionOutput<TName extends AgentActionName> = z.output<AgentActionEntry<TName>["output"]>


export const agentActions: AgentActionDefinition[] = Object.values(actionDefinitionMap)

type RegisteredAgentTool = {
  definition: AgentActionDefinition
  execute: (input: unknown) => Promise<unknown>
}

const createRegisteredTool = <Name extends AgentActionName>(
  name: Name,
  handler: (input: AgentActionInput<Name>) => Promise<AgentActionOutput<Name>>
): RegisteredAgentTool => {
  const definition = actionDefinitionMap[name]
  const runner = async (rawInput: unknown) => {
    const parsedInput = definition.input.parse(rawInput) as AgentActionInput<Name>
    const result = await handler(parsedInput)
    return definition.output.parse(result)
  }
  return {
    definition,
    execute: runner,
  }
}

const toolFactory = {
  ingest_rfp_bundle: createRegisteredTool("ingest_rfp_bundle", async input =>
    ingestRfpBundleAction.output.parse(await ingestRfpBundle(input))
  ),
  normalize_rfp: createRegisteredTool("normalize_rfp", async input =>
    normalizeRfpAction.output.parse(await normalizeRfp(input))
  ),
  mine_facts: createRegisteredTool("mine_facts", async input =>
    mineFactsAction.output.parse(await mineFacts(input))
  ),
  score_coverage: createRegisteredTool("score_coverage", async input =>
    scoreCoverageAction.output.parse(await scoreCoverage(input))
  ),
  draft_section: createRegisteredTool("draft_section", async input =>
    draftSectionAction.output.parse(await draftSection(input))
  ),
  tighten_section: createRegisteredTool("tighten_section", async input =>
    tightenSectionAction.output.parse(await tightenSection(input))
  ),
  export_docx: createRegisteredTool("export_docx", async input =>
    exportDocxAction.output.parse(await exportDocx(input))
  ),
} as const

export type AgentToolRegistry = typeof toolFactory

export const agentKitTools: AgentToolRegistry = toolFactory

export async function executeAgentAction<TAction extends AgentActionName>(action: TAction, input: AgentActionInput<TAction>): Promise<AgentActionOutput<TAction>> {
  const selected = agentKitTools[action]
  if (!selected) {
    throw new Error(`AgentKit action '${action}' is not registered`)
  }
  const result = await selected.execute(input)
  return result as AgentActionOutput<TAction>
}

export const agentkitWorkflowId = process.env.AGENTKIT_WORKFLOW_ID ?? "wf_undefined"

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
