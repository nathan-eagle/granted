"use client"

import React from "react"
import { toast } from "sonner"
import RichEditor, { type RichEditorHandle } from "./RichEditor"
import CountsBar from "./CountsBar"

function debounce<T extends (...args: any[]) => void>(fn: T, wait = 800) {
  let timeout: ReturnType<typeof setTimeout> | undefined
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), wait)
  }
}

type SectionCardProps = {
  section: any
  onChanged?: (section: any) => void
}

export default function SectionCard({ section, onChanged }: SectionCardProps) {
  const initialHtml = section?.contentHtml || (section?.contentMd ? `<p>${section.contentMd}</p>` : "<p></p>")
  const [html, setHtml] = React.useState<string>(initialHtml)
  const [saving, setSaving] = React.useState(false)
  const [wordCount, setWordCount] = React.useState<number>(section?.wordCount || 0)
  const [charCount, setCharCount] = React.useState<number>(initialHtml.replace(/<[^>]+>/g, " ").trim().length)
  const [writing, setWriting] = React.useState(false)
  const [limit, setLimit] = React.useState<number | undefined>(section?.limitWords ?? undefined)
  const editorRef = React.useRef<RichEditorHandle>(null)

  function extractMeta(value: any) {
    if (!value) return {}
    if (typeof value === "object") return value
    try {
      return JSON.parse(value)
    } catch {
      return {}
    }
  }
  const meta = React.useMemo(() => extractMeta(section?.contentJson), [section?.contentJson])

  const persist = React.useMemo(
    () =>
      debounce(async (nextHtml: string) => {
        setSaving(true)
        const text = nextHtml.replace(/<[^>]+>/g, " ")
        const words = text.trim() ? text.trim().split(/\s+/).length : 0
        setWordCount(words)
        setCharCount(text.replace(/\s+/g, " ").length)
        await fetch(`/api/sections/${section.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentHtml: nextHtml, wordCount: words }),
        })
        setSaving(false)
        onChanged?.({ ...section, contentHtml: nextHtml, wordCount: words, limitWords: limit })
      }),
    [section, onChanged, limit]
  )

  const saveLimit = React.useCallback(
    async (nextLimit: number | undefined) => {
      setLimit(nextLimit)
      await fetch(`/api/sections/${section.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limitWords: nextLimit ?? null }),
      })
      onChanged?.({ ...section, limitWords: nextLimit })
      toast.success("Limit saved")
    },
    [section, onChanged]
  )

  const trimToLimit = React.useCallback(async () => {
    if (!limit) return
    const projectId = section.projectId || window.location.pathname.split("/")[2] || ""
    const text = html.replace(/<[^>]+>/g, " ").trim()
    if (!text) return
    try {
      toast("Trimming section…")
      const prompt = `Rewrite the following grant section so it is at most ${limit} words while preserving key facts and clarity. Return only the rewritten text.`
      const res = await fetch("/api/ai/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, prompt: `${prompt}\n\n${text}`, sourceIds: [] }),
      })
      const json = await res.json()
      if (!json?.output) {
        toast.error("Trim assistant did not return content")
        return
      }
      const nextHtml = `<p>${json.output.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br/>")}</p>`
      setHtml(nextHtml)
      persist(nextHtml)
      toast.success("Trimmed to limit")
    } catch (error) {
      console.error("Failed to trim to limit", error)
      toast.error("Couldn't trim this section")
    }
  }, [limit, html, section, persist])

  return (
    <div className="rounded-lg border bg-white p-6 shadow-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{section.title}</h2>
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
          <div className="flex items-center gap-2 text-sm">
            <span>Limit</span>
            <input
              type="number"
              value={limit ?? ""}
              onChange={(event) => {
                const value = event.target.value
                setLimit(value ? Number(value) : undefined)
              }}
              className="w-20 rounded-md border px-2 py-1"
              placeholder="250"
            />
            <button
              onClick={() => saveLimit(limit)}
              className="rounded-md border px-2 py-1"
            >
              Save
            </button>
            <button
              onClick={trimToLimit}
              disabled={!limit}
              className="rounded-md bg-[hsl(var(--primary))] px-2 py-1 text-[hsl(var(--primary-foreground))] disabled:opacity-40"
            >
              Trim
            </button>
          </div>
          <div className="flex items-center gap-3">
            {saving ? <span>Saving…</span> : <span>Saved</span>}
            <CountsBar words={wordCount} chars={charCount} />
          </div>
        </div>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          onClick={async () => {
            if (writing) return
            setWriting(true)
            try {
              const projectId = section.projectId || window.location.pathname.split("/")[2] || ""
              const guidance = [meta?.about, meta?.prompt].filter(Boolean).join("\n\n")
              const res = await fetch("/api/ai/complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  projectId,
                  prompt: `Write a draft for the section "${section.title}". ${guidance}`,
                  sourceIds: [],
                }),
              })
              const json = await res.json()
              if (json?.output) {
                editorRef.current?.insertHTMLBelowSelection(json.output)
              } else {
                toast.error("Assistant did not return a draft")
              }
            } catch (error) {
              console.error(error)
              toast.error("Failed to generate draft")
            } finally {
              setWriting(false)
            }
          }}
          className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
          disabled={writing}
        >
          {writing ? "Writing…" : "Write for me"}
        </button>
      </div>
      <RichEditor
        ref={editorRef}
        content={html}
        onUpdate={(nextHtml) => {
          setHtml(nextHtml)
          persist(nextHtml)
        }}
      />
    </div>
  )
}
