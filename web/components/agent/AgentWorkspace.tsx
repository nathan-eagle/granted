'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import clsx from "clsx"

type UploadLite = {
  id: string
  filename: string
  kind: string
  openAiFileId?: string | null
}

type FirstDraftSection = {
  key: string
  title: string
  markdown: string
  compliance?: {
    status: "ok" | "overflow"
    wordCount: number
    estimatedPages: number
  }
  settings?: Record<string, unknown>
  assumptions?: string[]
  paragraph_meta?: unknown[]
}

type FirstDraftState = {
  projectId: string
  sections: FirstDraftSection[]
  coverage?: number
  coverageSuggestions?: Array<{ id: string; requirementId: string; action: string; label: string }>
}

type AgentWorkspaceProps = {
  projectId: string
  projectName: string
  initialSessionId: string
  initialUploads: UploadLite[]
  initialDraft: FirstDraftState
  initialAllowWebSearch?: boolean
  initialOrgUrl?: string
  initialIdea?: string
}

type BusyState = "upload" | "start" | "message" | "export" | "tighten" | null

type SseHandler = (event: string, payload: any) => void

type SectionDeltaPayload = {
  key: string
  title?: string
  delta?: string
  markdown?: string
  compliance?: {
    status: "ok" | "overflow"
    wordCount: number
    estimatedPages: number
  }
  settings?: Record<string, unknown>
  assumptions?: string[]
  paragraph_meta?: unknown[]
}

const PRIMARY_BUTTON = "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-sm hover:opacity-90"
const SECONDARY_BUTTON = "border border-gray-300 text-gray-700 hover:bg-gray-50"
const SUMMARY_SECTION_KEY = "summary"
const SUMMARY_SECTION_TITLE = "Project Summary"
const MIN_IDEA_WORDS = 25

function randomSectionKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `section-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function normalizeUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ""
  try {
    const withProtocol = /^(https?:)?\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    const parsed = new URL(withProtocol)
    return parsed.toString()
  } catch {
    return trimmed
  }
}

function looksLikeUrl(value: string) {
  if (!value) return false
  try {
    const parsed = new URL(normalizeUrl(value))
    return Boolean(parsed.host)
  } catch {
    return false
  }
}

async function consumeEventStream(stream: ReadableStream<Uint8Array>, onEvent: SseHandler) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let boundary = buffer.indexOf("\n\n")
      while (boundary !== -1) {
        const chunk = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 2)
        if (chunk.trim().length === 0) {
          boundary = buffer.indexOf("\n\n")
          continue
        }
        let event = "message"
        const dataLines: string[] = []
        for (const rawLine of chunk.split("\n")) {
          const line = rawLine.trim()
          if (!line) continue
          if (line.startsWith("event:")) {
            event = line.slice(6).trim()
          } else if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).trim())
          }
        }
        const combined = dataLines.join("")
        let payload: any = null
        if (combined) {
          try {
            payload = JSON.parse(combined)
          } catch (error) {
            console.warn("[agent-workspace] failed to parse SSE payload", combined, error)
          }
        }
        onEvent(event, payload)
        boundary = buffer.indexOf("\n\n")
      }
    }
  } finally {
    reader.releaseLock()
  }
}

function normalizeDraft(state: FirstDraftState): FirstDraftState {
  const map = new Map<string, FirstDraftSection>()
  for (const section of state.sections ?? []) {
    if (!section || typeof section !== "object") continue
    const key = typeof section.key === "string" && section.key.trim().length ? section.key : randomSectionKey()
    const title = section.title?.trim().length ? section.title : formatSectionTitle(key)
    const markdown = typeof section.markdown === "string" ? section.markdown : ""
    const next: FirstDraftSection = {
      key,
      title,
      markdown,
      ...(section.compliance ? { compliance: section.compliance } : {}),
      ...(section.settings ? { settings: section.settings } : {}),
      ...(section.assumptions ? { assumptions: section.assumptions } : {}),
      ...(section.paragraph_meta ? { paragraph_meta: section.paragraph_meta } : {}),
    }
    map.set(key, next)
  }
  if (!map.has(SUMMARY_SECTION_KEY)) {
    map.set(SUMMARY_SECTION_KEY, {
      key: SUMMARY_SECTION_KEY,
      title: SUMMARY_SECTION_TITLE,
      markdown: "",
    })
  }
  const summary = map.get(SUMMARY_SECTION_KEY)!
  const rest = Array.from(map.values()).filter(section => section.key !== SUMMARY_SECTION_KEY)
  return {
    projectId: state.projectId,
    sections: [summary, ...rest],
    coverage: state.coverage,
    coverageSuggestions: state.coverageSuggestions ?? [],
  }
}

function formatSectionTitle(key: string) {
  if (key === SUMMARY_SECTION_KEY) return SUMMARY_SECTION_TITLE
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, match => match.toUpperCase())
    .trim()
}

function applySectionDelta(state: FirstDraftState, payload: SectionDeltaPayload): FirstDraftState {
  const { key, delta = "", title, paragraph_meta } = payload
  if (!key) return state
  const sections = [...state.sections]
  const index = sections.findIndex(section => section.key === key)
  const existing = index >= 0 ? sections[index] : { key, title: formatSectionTitle(key), markdown: "" }
  const assumptionsFromMeta = Array.isArray(paragraph_meta)
    ? (paragraph_meta as Array<any>)
        .filter(entry => Boolean(entry?.assumption))
        .map(entry => String(entry?.requirement_path || entry?.label || "Assumption"))
    : undefined
  const updated: FirstDraftSection = {
    ...existing,
    title: title ?? existing.title ?? formatSectionTitle(key),
    markdown: `${existing.markdown ?? ""}${delta}`,
    ...(payload.compliance ? { compliance: payload.compliance } : {}),
    ...(payload.settings ? { settings: payload.settings } : {}),
    ...(payload.assumptions
      ? { assumptions: payload.assumptions }
      : assumptionsFromMeta
        ? { assumptions: assumptionsFromMeta }
        : {}),
    ...(paragraph_meta ? { paragraph_meta } : existing.paragraph_meta ? { paragraph_meta: existing.paragraph_meta } : {}),
  }
  if (index >= 0) {
    sections[index] = updated
  } else {
    sections.push(updated)
  }
  return normalizeDraft({ ...state, sections })
}

function applySectionOverwrite(state: FirstDraftState, payload: SectionDeltaPayload): FirstDraftState {
  const { key, markdown = "", title, paragraph_meta } = payload
  if (!key) return state
  const sections = [...state.sections]
  const index = sections.findIndex(section => section.key === key)
  const baseTitle = title ?? sections[index]?.title ?? formatSectionTitle(key)
  const assumptionsFromMeta = Array.isArray(paragraph_meta)
    ? (paragraph_meta as Array<any>)
        .filter(entry => Boolean(entry?.assumption))
        .map(entry => String(entry?.requirement_path || entry?.label || "Assumption"))
    : undefined
  const nextSection: FirstDraftSection = {
    key,
    title: baseTitle,
    markdown,
    ...(payload.compliance ? { compliance: payload.compliance } : sections[index]?.compliance ? { compliance: sections[index]?.compliance } : {}),
    ...(payload.settings ? { settings: payload.settings } : sections[index]?.settings ? { settings: sections[index]?.settings } : {}),
    ...(payload.assumptions
      ? { assumptions: payload.assumptions }
      : assumptionsFromMeta
        ? { assumptions: assumptionsFromMeta }
        : sections[index]?.assumptions
          ? { assumptions: sections[index]?.assumptions }
          : {}),
    ...(paragraph_meta ? { paragraph_meta } : {}),
  }
  if (index >= 0) {
    sections[index] = nextSection
  } else {
    sections.push(nextSection)
  }
  return normalizeDraft({ ...state, sections })
}

function resetDraft(state: FirstDraftState): FirstDraftState {
  return normalizeDraft({
    projectId: state.projectId,
    sections: state.sections.map(section => ({
      ...section,
      markdown: "",
      compliance: undefined,
      paragraph_meta: undefined,
    })),
    coverage: undefined,
    coverageSuggestions: state.coverageSuggestions,
  })
}

export default function AgentWorkspace({
  projectId,
  projectName,
  initialSessionId,
  initialUploads,
  initialDraft,
  initialAllowWebSearch = false,
  initialOrgUrl = "",
  initialIdea = "",
}: AgentWorkspaceProps) {
  const initialOrgNormalized = initialOrgUrl ? normalizeUrl(initialOrgUrl) : ""
  const initialIdeaTrimmed = initialIdea.trim()
  const [uploads, setUploads] = useState<UploadLite[]>(initialUploads)
  const [sessionId, setSessionId] = useState<string>(initialSessionId)
  const [draft, setDraft] = useState<FirstDraftState>(normalizeDraft(initialDraft))
  const draftRef = useRef<FirstDraftState>(normalizeDraft(initialDraft))
  const [status, setStatus] = useState<string>("Idle")
  const [phase, setPhase] = useState<string>("idle")
  const [busy, setBusy] = useState<BusyState>(null)
  const [streaming, setStreaming] = useState(false)
  const [composer, setComposer] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [allowWebSearch, setAllowWebSearch] = useState<boolean>(initialAllowWebSearch)
  const [focusSectionKey, setFocusSectionKey] = useState<string | null>(null)
  const [autoStartCountdown, setAutoStartCountdown] = useState<number | null>(null)
  const [orgUrl, setOrgUrl] = useState<string>(initialOrgNormalized)
  const [projectIdea, setProjectIdea] = useState<string>(initialIdeaTrimmed)
  const [rfpUrl, setRfpUrl] = useState<string>("")
  const summaryRef = useRef<string>("")
  const abortRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)
  const autoStartTimerRef = useRef<NodeJS.Timeout | null>(null)
  const metaPersistRef = useRef({ orgUrl: initialOrgNormalized.trim(), projectIdea: initialIdeaTrimmed })

  const hasUploads = uploads.length > 0
  const summarySection = useMemo(() => draft.sections.find(section => section.key === SUMMARY_SECTION_KEY), [draft])
  const detailSections = useMemo(() => draft.sections.filter(section => section.key !== SUMMARY_SECTION_KEY), [draft])
  const hasDraft = Boolean(summarySection?.markdown?.trim()) || detailSections.some(section => section.markdown?.trim())
  const primaryAction: "add" | "start" | "export" = !hasUploads ? "add" : hasDraft ? "export" : "start"

  const provenanceChips = useMemo(() => {
    const kinds = new Set<string>()
    uploads.forEach(upload => {
      if (upload.kind) kinds.add(upload.kind.toUpperCase())
    })
    return Array.from(kinds)
  }, [uploads])

  const activitySteps = ["ingest", "normalize", "draft", "sections", "done"]
  const currentStepIndex = activitySteps.indexOf(phase)
  const overflowSections = useMemo(
    () => detailSections.filter(section => section.compliance?.status === "overflow"),
    [detailSections],
  )
  const nextOverflowSection = overflowSections[0] ?? null
  const coveragePercent =
    typeof draft.coverage === "number" && Number.isFinite(draft.coverage)
      ? Math.round(draft.coverage * 100)
      : null
  const hasOrgUrl = useMemo(() => looksLikeUrl(orgUrl), [orgUrl])
  const ideaWordCount = useMemo(() => projectIdea.trim().split(/\s+/).filter(Boolean).length, [projectIdea])
  const readyForAutoStart = hasUploads && hasOrgUrl && ideaWordCount >= MIN_IDEA_WORDS && !hasDraft

  useEffect(() => {
    return () => {
      mountedRef.current = false
      abortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    if (streaming) return
    if (overflowSections.length === 0) {
      setFocusSectionKey(null)
      return
    }
    if (nextOverflowSection && focusSectionKey === null) {
      setFocusSectionKey(nextOverflowSection.key)
    }
  }, [streaming, overflowSections.length, nextOverflowSection, focusSectionKey])

  const updateDraft = useCallback((next: FirstDraftState) => {
    const normalized = normalizeDraft(next)
    draftRef.current = normalized
    setDraft(normalized)
  }, [])

  const cancelAutoStart = useCallback(() => {
    if (autoStartTimerRef.current) {
      clearInterval(autoStartTimerRef.current)
      autoStartTimerRef.current = null
    }
    setAutoStartCountdown(null)
  }, [])

  const loadSession = useCallback(async (target?: string) => {
    const sessionKey = target || sessionId
    if (!sessionKey) return
    try {
      const res = await fetch(`/api/agent/session/${sessionKey}`)
      if (!res.ok) return
      const data = await res.json()
      if (!mountedRef.current) return
      if (typeof data.sessionId === "string") {
        setSessionId(data.sessionId)
      }
      if (data?.draft?.projectId) {
        updateDraft({
          projectId: data.draft.projectId,
          sections: Array.isArray(data.draft.sections) ? data.draft.sections : [],
          coverage: typeof data.draft.coverage === "number" ? data.draft.coverage : undefined,
          coverageSuggestions: Array.isArray(data.draft.coverageSuggestions) ? data.draft.coverageSuggestions : undefined,
        })
        summaryRef.current = draftRef.current.sections.find(section => section.key === SUMMARY_SECTION_KEY)?.markdown ?? ""
      }
      if (Array.isArray(data.uploads)) {
        setUploads(
          data.uploads.map((item: any) => ({
            id: item.id,
            filename: item.filename,
            kind: item.kind,
            openAiFileId: item.openAiFileId ?? null,
          }))
        )
      }
      const allowWeb = Boolean(data?.preferences?.allowWebSearch)
      setAllowWebSearch(allowWeb)
      if (data?.context) {
        const serverOrgRaw = typeof data.context.orgUrl === "string" ? data.context.orgUrl : ""
        const serverIdeaRaw = typeof data.context.projectIdea === "string" ? data.context.projectIdea : ""
        const normalizedOrg = serverOrgRaw ? normalizeUrl(serverOrgRaw) : ""
        const trimmedIdea = serverIdeaRaw.trim()
        if (normalizedOrg !== metaPersistRef.current.orgUrl) {
          setOrgUrl(normalizedOrg)
        }
        if (trimmedIdea !== metaPersistRef.current.projectIdea) {
          setProjectIdea(trimmedIdea)
        }
        metaPersistRef.current = { orgUrl: normalizedOrg.trim(), projectIdea: trimmedIdea }
      }
    } catch (error) {
      console.warn("[agent-workspace] load session failed", error)
    }
  }, [sessionId, updateDraft])

  useEffect(() => {
    loadSession(initialSessionId)
  }, [initialSessionId, loadSession])

  useEffect(() => {
    const normalizedOrg = orgUrl.trim() ? normalizeUrl(orgUrl) : ""
    const trimmedIdea = projectIdea.trim()
    const canPersistOrg = !normalizedOrg || looksLikeUrl(normalizedOrg)
    const payload: Record<string, string> = {}
    if (canPersistOrg && normalizedOrg !== metaPersistRef.current.orgUrl) {
      payload.orgUrl = normalizedOrg
    }
    if (trimmedIdea !== metaPersistRef.current.projectIdea) {
      payload.projectIdea = trimmedIdea
    }
    if (Object.keys(payload).length === 0) {
      return
    }
    const timer = setTimeout(async () => {
      try {
        await fetch(`/api/projects/${projectId}/context`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (payload.orgUrl !== undefined) {
          metaPersistRef.current.orgUrl = payload.orgUrl.trim()
        }
        if (payload.projectIdea !== undefined) {
          metaPersistRef.current.projectIdea = payload.projectIdea
        }
      } catch (error) {
        console.warn("[agent-workspace] failed to persist project context", error)
      }
    }, 700)
    return () => clearTimeout(timer)
  }, [orgUrl, projectIdea, projectId])

  async function refreshUploads() {
    try {
      const res = await fetch(`/api/uploads?projectId=${projectId}`)
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data?.uploads)) {
        setUploads(
          data.uploads.map((item: any) => ({
            id: item.id,
            filename: item.filename,
            kind: item.kind,
            openAiFileId: item.openAiFileId ?? null,
          }))
        )
      }
    } catch (error) {
      console.warn("[agent-workspace] refresh uploads failed", error)
    }
  }

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  async function handleFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (!files || files.length === 0) return

    const form = new FormData()
    form.append("projectId", projectId)
    if (sessionId) form.append("sessionId", sessionId)
    Array.from(files).forEach(file => form.append("file", file))

    setBusy("upload")
    setStatus("Uploading files…")
    setErrorMessage(null)
    try {
      const res = await fetch("/api/autopilot/upload", { method: "POST", body: form })
      if (!res.ok) {
        const message = await res.text()
        throw new Error(message || "Upload failed")
      }
      await refreshUploads()
      setStatus("Files ready.")
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setStatus("Upload failed")
      setErrorMessage(message)
    } finally {
      setBusy(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function handleUrlUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedUrl = rfpUrl.trim()
    if (!trimmedUrl || busy === "upload") return

    setBusy("upload")
    setStatus("Fetching RFP from URL…")
    setErrorMessage(null)
    try {
      const form = new FormData()
      form.append("projectId", projectId)
      if (sessionId) form.append("sessionId", sessionId)
      form.append("url", trimmedUrl)
      if (trimmedUrl.toLowerCase().includes("faq")) {
        form.append("kind", "faq")
      }
      const res = await fetch("/api/autopilot/upload", {
        method: "POST",
        body: form,
      })
      if (!res.ok) {
        const message = await res.text()
        throw new Error(message || "URL ingest failed")
      }
      await refreshUploads()
      setStatus("RFP URL uploaded")
      setRfpUrl("")
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setStatus("Upload failed")
      setErrorMessage(message)
    } finally {
      setBusy(null)
    }
  }

  const handleStart = useCallback(async () => {
    if (busy === "start" || streaming || !hasUploads) return
    cancelAutoStart()
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setBusy("start")
    setStreaming(true)
    setErrorMessage(null)
    setStatus("Preparing draft…")
    setPhase("ingest")
    summaryRef.current = ""
    updateDraft(resetDraft(draftRef.current))

    try {
      const response = await fetch("/api/agent/session", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          projectId,
          allowWebSearch,
        }),
      })
      if (!response.ok || !response.body) {
        const text = await response.text()
        throw new Error(text || "Failed to start drafting")
      }

      await consumeEventStream(response.body, (event, payload) => {
        if (event === "session" && payload?.sessionId) {
          setSessionId(payload.sessionId)
          if (payload.context) {
            const upstreamOrg = typeof payload.context.orgUrl === "string" ? payload.context.orgUrl : ""
            const upstreamIdea = typeof payload.context.projectIdea === "string" ? payload.context.projectIdea : ""
            const normalizedOrg = upstreamOrg ? normalizeUrl(upstreamOrg) : ""
            const trimmedIdea = upstreamIdea.trim()
            if (normalizedOrg !== metaPersistRef.current.orgUrl) {
              setOrgUrl(normalizedOrg)
              metaPersistRef.current.orgUrl = normalizedOrg.trim()
            }
            if (trimmedIdea !== metaPersistRef.current.projectIdea) {
              setProjectIdea(trimmedIdea)
              metaPersistRef.current.projectIdea = trimmedIdea
            }
          }
        }
        if (event === "status" && payload) {
          if (payload.step) setPhase(String(payload.step))
          if (payload.label) setStatus(String(payload.label))
        }
        if (event === "uploads" && Array.isArray(payload?.uploads)) {
          setUploads(payload.uploads)
        }
        if (event === "section_delta" && payload?.key) {
          if (payload.key === SUMMARY_SECTION_KEY && typeof payload.delta === "string") {
            summaryRef.current = `${summaryRef.current}${payload.delta}`
          }
          updateDraft(applySectionDelta(draftRef.current, payload))
        }
        if (event === "section_complete" && payload?.key) {
          updateDraft(applySectionOverwrite(draftRef.current, payload))
        }
        if (event === "coverage" && typeof payload?.score === "number") {
          updateDraft({
            ...draftRef.current,
            coverage: payload.score,
            coverageSuggestions: Array.isArray(payload.suggestions)
              ? payload.suggestions
              : draftRef.current.coverageSuggestions,
          })
        }
        if (event === "done" && payload?.projectId) {
          updateDraft({
            projectId: payload.projectId,
            sections: Array.isArray(payload.sections) ? payload.sections : [],
            coverage: typeof payload.coverage === "number" ? payload.coverage : undefined,
            coverageSuggestions: Array.isArray(payload.coverageSuggestions)
              ? payload.coverageSuggestions
              : draftRef.current.coverageSuggestions,
          })
          setPhase("done")
          setStatus("Draft ready")
        }
        if (event === "error") {
          const message = payload?.message ? String(payload.message) : "Draft failed"
          setStatus("Draft failed")
          setErrorMessage(message)
        }
      })
    } catch (error) {
      if (controller.signal.aborted) {
        setStatus("Draft cancelled")
      } else {
        const message = error instanceof Error ? error.message : String(error)
        setStatus("Draft failed")
        setErrorMessage(message)
      }
    } finally {
      setBusy(null)
      setStreaming(false)
      abortRef.current = null
      await loadSession()
    }
  }, [busy, streaming, hasUploads, cancelAutoStart, projectId, allowWebSearch, updateDraft, loadSession])

  useEffect(() => {
    if (!readyForAutoStart || streaming || busy === "start") {
      cancelAutoStart()
      return
    }
    if (autoStartCountdown !== null) return
    setAutoStartCountdown(3)
    autoStartTimerRef.current = setInterval(() => {
      setAutoStartCountdown(prev => (prev === null ? null : prev - 1))
    }, 1000)
    return cancelAutoStart
  }, [readyForAutoStart, streaming, busy, autoStartCountdown, cancelAutoStart])

  useEffect(() => {
    if (autoStartCountdown !== null && autoStartCountdown <= 0) {
      cancelAutoStart()
      void handleStart()
    }
  }, [autoStartCountdown, cancelAutoStart, handleStart])

  async function handleSendMessage() {
    if (!sessionId || !composer.trim() || busy === "message") return
    const message = composer.trim()
    setBusy("message")
    setComposer("")
    setStatus("Sending…")
    setErrorMessage(null)
    try {
      const res = await fetch(`/api/agent/session/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allowWebSearch,
          text: message,
        }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || "Message failed")
      }
      setStatus("Message sent")
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error)
      setStatus("Message failed")
      setErrorMessage(messageText)
    } finally {
      setBusy(null)
    }
  }

  async function handleExport() {
    if (busy === "export" || !hasDraft) return
    setBusy("export")
    setStatus("Preparing export…")
    setErrorMessage(null)
    try {
      const res = await fetch(`/api/export/docx?projectId=${projectId}`)
      if (!res.ok) throw new Error(`Export failed (${res.status})`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${projectName || "grant"}.docx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setStatus("Export ready")
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setStatus("Export failed")
      setErrorMessage(message)
    } finally {
      setBusy(null)
    }
  }

  const handleTighten = useCallback(async (section: FirstDraftSection) => {
    if (!sessionId || busy === "tighten") return
    setFocusSectionKey(section.key)
    setBusy("tighten")
    setStatus(`Tightening ${section.title}…`)
    setErrorMessage(null)
    try {
      const res = await fetch(`/api/agent/session/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "tighten",
          sectionKey: section.key,
          allowWebSearch,
        }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || "Tighten failed")
      }
      const data = await res.json()
      if (data?.draft?.projectId) {
        updateDraft({
          projectId: data.draft.projectId,
          sections: Array.isArray(data.draft.sections) ? data.draft.sections : draftRef.current.sections,
          coverage: typeof data.draft.coverage === "number" ? data.draft.coverage : draftRef.current.coverage,
          coverageSuggestions: Array.isArray(data.draft.coverageSuggestions)
            ? data.draft.coverageSuggestions
            : draftRef.current.coverageSuggestions,
        })
        const overflowAfter = draftRef.current.sections.filter(
          item => item.key !== SUMMARY_SECTION_KEY && item.compliance?.status === "overflow",
        )
        const next = overflowAfter.find(item => item.key !== section.key) ?? overflowAfter[0] ?? null
        setFocusSectionKey(next?.key ?? null)
      }
      setStatus("Section tightened")
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setStatus("Tighten failed")
      setErrorMessage(message)
    } finally {
      setBusy(null)
    }
  }, [sessionId, busy, allowWebSearch, updateDraft])

  const handleFixNext = useCallback(() => {
    if (nextOverflowSection) {
      void handleTighten(nextOverflowSection)
    }
  }, [nextOverflowSection, handleTighten])

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{projectName}</h1>
            <p className="text-sm text-gray-600">Add files, start drafting, then export — all on one screen.</p>
          </div>
          <StatusDots steps={activitySteps} currentIndex={currentStepIndex} />
        </div>
        <div className="text-xs text-gray-500">{status}</div>
        {coveragePercent !== null && (
          <div className="text-xs text-gray-500">Coverage: {coveragePercent}%</div>
        )}
        {errorMessage && <div className="text-xs text-red-500">{errorMessage}</div>}
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleUploadClick}
          className={clsx("inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium", primaryAction === "add" ? PRIMARY_BUTTON : SECONDARY_BUTTON)}
          disabled={busy === "upload"}
        >
          {busy === "upload" ? "Uploading…" : "Add files"}
        </button>
        <button
          type="button"
          onClick={handleStart}
          className={clsx("inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium", primaryAction === "start" ? PRIMARY_BUTTON : SECONDARY_BUTTON)}
          disabled={!hasUploads || streaming || busy === "start"}
        >
          {streaming ? "Drafting…" : "Start"}
        </button>
        <button
          type="button"
          onClick={handleExport}
          className={clsx("inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium", primaryAction === "export" ? PRIMARY_BUTTON : SECONDARY_BUTTON)}
          disabled={!hasDraft || busy === "export"}
        >
          {busy === "export" ? "Preparing…" : "Export"}
        </button>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFilesSelected} />
        <label className="flex items-center gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]"
            checked={allowWebSearch}
            onChange={event => setAllowWebSearch(event.target.checked)}
            disabled={streaming || busy === "start"}
          />
          Allow web lookups
        </label>
        {autoStartCountdown !== null && (
          <div className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
            <span>Starting draft in {autoStartCountdown}s…</span>
            <button
              type="button"
              className="text-[hsl(var(--primary))] hover:underline"
              onClick={cancelAutoStart}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="rounded-lg border bg-white p-4">
          <header className="flex items-center justify-between text-xs text-gray-500">
            <span>Draft</span>
            <div className="flex gap-2">
              {provenanceChips.map(chip => (
                <span key={chip} className="rounded-full border border-gray-200 px-2 py-0.5 text-[11px] uppercase text-gray-600">
                  {chip}
                </span>
              ))}
            </div>
          </header>
          <div className="mt-3 space-y-4 text-sm text-gray-800">
            <article className="whitespace-pre-wrap text-gray-800">
              {summarySection?.markdown?.length ? summarySection.markdown : <span className="text-gray-500">Press Start to generate a project summary.</span>}
            </article>
            {summarySection?.compliance && (
              <div
                className={clsx(
                  "flex flex-wrap items-center gap-2 text-xs",
                  summarySection.compliance.status === "overflow" ? "text-red-600" : "text-emerald-600",
                )}
              >
                <span className="font-medium">
                  {summarySection.compliance.status === "overflow" ? "Overflow" : "Within limits"}
                </span>
                <span className="text-gray-500">
                  {summarySection.compliance.wordCount} words • {summarySection.compliance.estimatedPages.toFixed(2)} pages
                </span>
              </div>
            )}
            {detailSections.map(section => {
              const isFocused = focusSectionKey === section.key
              const isOverflow = section.compliance?.status === "overflow"
              return (
                <div
                  key={section.key}
                  className={clsx(
                    "rounded-md border border-gray-200 p-3 transition-shadow",
                    isFocused && "ring-2 ring-offset-2 ring-[hsl(var(--primary))]",
                  )}
                >
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="font-medium text-gray-700">{section.title}</span>
                    {section.markdown?.trim().length > 0 && (
                      <button
                        type="button"
                        className={clsx(
                          "rounded border px-2 py-1 text-[11px]",
                          isOverflow
                            ? "border-amber-400 text-amber-700 hover:bg-amber-50"
                            : "border-gray-300 text-gray-600 hover:bg-gray-50",
                        )}
                        onClick={() => handleTighten(section)}
                        disabled={busy === "tighten"}
                      >
                        Tighten
                      </button>
                    )}
                  </div>
                  {section.compliance && (
                    <div
                      className={clsx(
                        "mt-2 flex flex-wrap items-center gap-2 text-xs",
                        section.compliance.status === "overflow" ? "text-red-600" : "text-emerald-600",
                      )}
                    >
                      <span className="font-medium">
                        {section.compliance.status === "overflow" ? "Overflow" : "Within limits"}
                      </span>
                      <span className="text-gray-500">
                        {section.compliance.wordCount} words • {section.compliance.estimatedPages.toFixed(2)} pages
                      </span>
                    </div>
                  )}
                  {section.assumptions?.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {section.assumptions.map((assumption, index) => (
                        <span
                          key={`${section.key}-assumption-${index}`}
                          className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800"
                          title={assumption}
                        >
                          Assumption
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <pre className="mt-2 whitespace-pre-wrap text-xs text-gray-700">
                    {section.markdown?.trim().length ? section.markdown : streaming ? "(drafting…)" : "(not started)"}
                  </pre>
                </div>
              )
            })}
          </div>
        </section>

        <aside className="flex flex-col gap-4">
        <div className="rounded-lg border bg-white p-4 text-sm">
          <div className="text-xs uppercase text-gray-500">Composer</div>
          <div className="mt-3 space-y-3">
            <form onSubmit={handleUrlUpload} className="space-y-2">
              <label className="block text-xs font-medium text-gray-600">
                RFP URL
                <div className="mt-1 flex gap-2">
                  <input
                    type="url"
                    value={rfpUrl}
                    onChange={event => setRfpUrl(event.target.value)}
                    placeholder="https://example.org/rfp.pdf"
                    className="flex-1 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                  />
                  <button
                    type="submit"
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    disabled={!rfpUrl.trim() || busy === "upload"}
                  >
                    {busy === "upload" ? "Uploading…" : "Upload"}
                  </button>
                </div>
              </label>
              <p className="text-[11px] text-gray-500">
                Paste the solicitation link; we’ll fetch it and add it to the project’s knowledge base.
              </p>
            </form>
            <label className="block text-xs font-medium text-gray-600">
              Organization site
              <input
                  type="url"
                  value={orgUrl}
                  onChange={event => setOrgUrl(event.target.value)}
                  onBlur={event => setOrgUrl(normalizeUrl(event.target.value))}
                  placeholder="https://your-org.org"
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                />
              </label>
              <label className="block text-xs font-medium text-gray-600">
                Project idea (2–3 sentences)
                <textarea
                  rows={3}
                  value={projectIdea}
                  onChange={event => setProjectIdea(event.target.value)}
                  placeholder="Summarize your approach so the draft starts with your framing."
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                />
              </label>
              <div className="text-xs text-gray-500">
                {!hasUploads
                  ? "Upload the RFP bundle to enable auto-start."
                  : !hasOrgUrl
                    ? "Add your organization site to trigger auto-start."
                    : ideaWordCount < MIN_IDEA_WORDS
                      ? `Add ${MIN_IDEA_WORDS - ideaWordCount} more words about the idea to auto-start.`
                      : autoStartCountdown !== null
                        ? "Auto-start in progress — cancel from the banner above if you need more time."
                        : "All set. Start will trigger automatically once uploads finish."}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input
                value={composer}
                onChange={event => setComposer(event.target.value)}
                placeholder="Ask for the next task…"
                className="flex-1 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
              />
              <button
                type="button"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={handleSendMessage}
                disabled={!sessionId || !composer.trim() || busy === "message"}
              >
                {busy === "message" ? "Sending…" : "Send"}
              </button>
            </div>
            {nextOverflowSection && (
              <button
                type="button"
                className="mt-2 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-200"
                onClick={handleFixNext}
                disabled={busy === "tighten" || streaming}
              >
                Fix next: {nextOverflowSection.title}
              </button>
            )}
            {draft.coverageSuggestions?.length ? (
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                <span>Suggestions:</span>
                {draft.coverageSuggestions.slice(0, 3).map(item => (
                  <span key={item.id} className="rounded-full bg-gray-100 px-2 py-0.5">
                    {item.label}
                  </span>
                ))}
              </div>
            ) : null}
            <p className="mt-2 text-xs text-gray-500">Attach files, click Start, then iterate via the composer. Drafts stream in-place.</p>
          </div>

          <div className="rounded-lg border bg-white p-4 text-sm">
            <div className="text-xs uppercase text-gray-500">Uploads</div>
            <ul className="mt-2 space-y-1 text-gray-600">
              {uploads.length === 0 && <li className="text-xs text-gray-500">No files yet.</li>}
              {uploads.map(upload => (
                <li key={upload.id} className="flex items-center justify-between text-xs">
                  <span>{upload.filename}</span>
                  <span className="text-gray-400">{upload.kind}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}

type StatusDotsProps = {
  steps: string[]
  currentIndex: number
}

function StatusDots({ steps, currentIndex }: StatusDotsProps) {
  return (
    <div className="flex items-center gap-1">
      {steps.map((step, index) => (
        <div
          key={step}
          className={clsx(
            "h-2.5 w-2.5 rounded-full",
            index <= currentIndex && currentIndex !== -1 ? "bg-[hsl(var(--primary))]" : "bg-gray-200"
          )}
        />
      ))}
    </div>
  )
}
