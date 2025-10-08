import { z } from "zod"

import {
  CoverageV1Schema,
  FactsV1Schema,
  RfpNormV1Schema,
  SectionDraftV1Schema,
} from "../contracts"
import { tool } from "@openai/agents"
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

const FileDescriptorSchema = z.object({
  uploadId: z.string().nullish(),
  path: z.string().nullish(),
  name: z.string().nullish(),
})

export const ingestRfpBundleAction: AgentActionDefinition = {
  name: "ingest_rfp_bundle",
  description: "Ingest a set of RFP files and/or URLs and return upload identifiers for downstream processing.",
  input: z.object({
    projectId: z.string(),
    files: z.array(FileDescriptorSchema).default([]),
    urls: z.array(z.string().url()).default([]),
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
        font: z.string().nullish(),
        size: z.number().nullish(),
        spacing: z.string().nullish(),
        margins: z.number().nullish(),
        hard_word_limit: z.number().nullish(),
        soft_page_limit: z.number().nullish(),
      })
      .default({}),
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

type ActionName = keyof typeof actionDefinitionMap

export const toolParameterSchemas: Record<ActionName, any> = {
  ingest_rfp_bundle: {
    type: "object",
    additionalProperties: false,
    required: ["projectId", "files", "urls"],
    properties: {
      projectId: { type: "string" },
      files: {
        type: "array",
        default: [],
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            uploadId: { type: "string", nullable: true },
            path: { type: "string", nullable: true },
            name: { type: "string", nullable: true },
          },
          required: ["uploadId", "path", "name"],
        },
      },
      urls: {
        type: "array",
        default: [],
        items: { type: "string" },
      },
    },
  },
  normalize_rfp: {
    type: "object",
    additionalProperties: false,
    required: ["projectId", "uploadIds"],
    properties: {
      projectId: { type: "string" },
      uploadIds: { type: "array", items: { type: "string" } },
    },
  },
  mine_facts: {
    type: "object",
    additionalProperties: false,
    required: ["projectId", "uploadIds"],
    properties: {
      projectId: { type: "string" },
      uploadIds: { type: "array", items: { type: "string" } },
    },
  },
  score_coverage: {
    type: "object",
    additionalProperties: false,
    required: ["projectId"],
    properties: {
      projectId: { type: "string" },
    },
  },
  draft_section: {
    type: "object",
    additionalProperties: false,
    required: ["projectId", "section_key"],
    properties: {
      projectId: { type: "string" },
      section_key: { type: "string" },
    },
  },
  tighten_section: {
    type: "object",
    additionalProperties: false,
    required: ["projectId", "section_key", "simulator"],
    properties: {
      projectId: { type: "string" },
      section_key: { type: "string" },
      simulator: {
        type: "object",
        additionalProperties: false,
        default: {},
        properties: {
          font: { type: "string", nullable: true },
          size: { type: "number", nullable: true },
          spacing: { type: "string", nullable: true },
          margins: { type: "number", nullable: true },
          hard_word_limit: { type: "number", nullable: true },
          soft_page_limit: { type: "number", nullable: true },
        },
      },
    },
  },
  export_docx: {
    type: "object",
    additionalProperties: false,
    required: ["projectId"],
    properties: {
      projectId: { type: "string" },
    },
  },
}

export type AgentActionName = ActionName
export type AgentActionEntry<TName extends AgentActionName> = typeof actionDefinitionMap[TName]
export type AgentActionInput<TName extends AgentActionName> = z.input<AgentActionEntry<TName>["input"]>
export type AgentActionOutput<TName extends AgentActionName> = z.output<AgentActionEntry<TName>["output"]>


export const agentActions: AgentActionDefinition[] = Object.values(actionDefinitionMap)

type RegisteredAgentTool = {
  definition: AgentActionDefinition
  tool: ReturnType<typeof tool>
  execute: (input: unknown) => Promise<unknown>
}

const createRegisteredTool = <Name extends AgentActionName>(
  name: Name,
  handler: (input: AgentActionInput<Name>) => Promise<AgentActionOutput<Name>>
): RegisteredAgentTool => {
  const definition = actionDefinitionMap[name]
  const runner = async (rawInput: unknown) => {
    const parsed = definition.input.parse(rawInput) as AgentActionInput<Name>
    const normalized = normalizeInputForAction(name, parsed)
    const result = await handler(normalized)
    return definition.output.parse(result)
  }
  return {
    definition,
    tool: tool({
      name: definition.name,
      description: definition.description,
      parameters: toolParameterSchemas[name],
      strict: false,
      execute: runner,
    }),
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

export function getAgentKitToolset() {
  return Object.values(agentKitTools).map(entry => entry.tool)
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
function normalizeInputForAction<Name extends AgentActionName>(name: Name, input: AgentActionInput<Name>): AgentActionInput<Name> {
  if (name === "ingest_rfp_bundle") {
    const value = input as AgentActionInput<"ingest_rfp_bundle">
    type FileEntry = NonNullable<AgentActionInput<"ingest_rfp_bundle">["files"]>[number]
    const sanitizedFiles = ((value.files ?? []) as FileEntry[]).map(file => ({
      uploadId: file?.uploadId ?? undefined,
      path: file?.path ?? undefined,
      name: file?.name ?? undefined,
    }))
    return {
      ...value,
      files: sanitizedFiles,
      urls: value.urls ?? [],
    } as AgentActionInput<Name>
  }
  if (name === "tighten_section") {
    const value = input as AgentActionInput<"tighten_section">
    const simulator = value.simulator ?? {}
    const sanitized = Object.fromEntries(
      Object.entries(simulator).filter((entry): entry is [string, unknown] => {
        const [, v] = entry
        return v !== null && v !== undefined
      })
    ) as AgentActionInput<Name>["simulator"]
    return { ...value, simulator: sanitized } as AgentActionInput<Name>
  }
  return input
}
