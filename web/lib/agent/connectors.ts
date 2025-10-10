import { z } from "zod"

const connectorSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: z.enum(["file", "ocr", "html", "search"]),
  formats: z.array(z.string()).default([]),
  region: z.string().default(process.env.AGENTKIT_CONNECTOR_REGION ?? "us-east-1"),
  monthlyQuota: z.number().nullable().optional(),
})

export type AgentConnectorConfig = z.infer<typeof connectorSchema>

type ConnectorKey = "pdf" | "ocr" | "html" | "file_search"

type RawConnectorSpec = {
  env: string
  label: string
  kind: AgentConnectorConfig["kind"]
  formats: string[]
  optional?: boolean
}

const CONNECTOR_SPECS: Record<ConnectorKey, RawConnectorSpec> = {
  pdf: {
    env: "AGENTKIT_CONNECTOR_FILE_PDF",
    label: "PDF Intake",
    kind: "file",
    formats: ["pdf"],
  },
  ocr: {
    env: "AGENTKIT_CONNECTOR_FILE_OCR",
    label: "Scan / OCR Intake",
    kind: "ocr",
    formats: ["png", "jpg", "jpeg", "tiff", "bmp"],
    optional: true,
  },
  html: {
    env: "AGENTKIT_CONNECTOR_FILE_HTML",
    label: "HTML Intake",
    kind: "html",
    formats: ["html", "htm"],
  },
  file_search: {
    env: "AGENTKIT_CONNECTOR_FILE_SEARCH",
    label: "File Search",
    kind: "file",
    formats: [],
  },
}

export type AgentConnectorRegistry = Record<ConnectorKey, AgentConnectorConfig | null>

export function loadConnectorRegistry(): AgentConnectorRegistry {
  const registry = {
    pdf: null,
    ocr: null,
    html: null,
    file_search: null,
  } as AgentConnectorRegistry

  (Object.entries(CONNECTOR_SPECS) as [ConnectorKey, RawConnectorSpec][]).forEach(([key, spec]) => {
    const raw = process.env[spec.env]
    if (!raw) {
      if (!spec.optional) {
        throw new Error(`AgentKit connector env ${spec.env} is required for ${spec.label}`)
      }
      registry[key] = null
      return
    }

    const parsed = (() => {
      try {
        const maybeJson = JSON.parse(raw)
        if (typeof maybeJson === "object" && maybeJson && "id" in maybeJson) {
          return connectorSchema.parse({
            id: String((maybeJson as any).id),
            label: String((maybeJson as any).label ?? spec.label),
            kind: spec.kind,
            formats: spec.formats.length ? spec.formats : ((maybeJson as any).formats ?? []),
            region: (maybeJson as any).region ?? undefined,
            monthlyQuota: (maybeJson as any).monthlyQuota ?? (maybeJson as any).quota ?? undefined,
          })
        }
      } catch (error) {
        // If JSON parse fails we'll fall back to simple string config
      }
      return connectorSchema.parse({
        id: raw.trim(),
        label: spec.label,
        kind: spec.kind,
        formats: spec.formats,
      })
    })()

    registry[key] = parsed
  })

  validateConnectorRegions(registry)
  return registry
}

function validateConnectorRegions(registry: AgentConnectorRegistry) {
  const configured = Object.values(registry).filter(Boolean) as AgentConnectorConfig[]
  if (!configured.length) return
  const firstRegion = configured[0]?.region
  const mismatch = configured.find(connector => connector.region !== firstRegion)
  if (mismatch) {
    throw new Error(
      `AgentKit connectors must share a region. Expected ${firstRegion}, but connector ${mismatch.label} uses ${mismatch.region}.`
    )
  }
}

export function pickConnectorForFile(
  registry: AgentConnectorRegistry,
  filename?: string | null
): AgentConnectorConfig | null {
  if (!filename) return registry.pdf ?? registry.html ?? registry.ocr ?? null
  const ext = filename.split(".").pop()?.toLowerCase()
  if (!ext) return registry.pdf ?? registry.html ?? registry.ocr ?? null
  const matches = (Object.values(registry).filter(Boolean) as AgentConnectorConfig[]).find(connector =>
    connector.formats.includes(ext)
  )
  return matches ?? registry.pdf ?? registry.html ?? registry.ocr ?? null
}

export function getFileSearchConnector(registry: AgentConnectorRegistry): AgentConnectorConfig | null {
  return registry.file_search
}
