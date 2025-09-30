"use client"

import React from "react"
import { toast } from "sonner"
import RichEditor from "./RichEditor"
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
        onChanged?.({ ...section, contentHtml: nextHtml, wordCount: words })
      }),
    [section, onChanged]
  )

  return (
    <div className="bg-white border rounded-lg shadow-card p-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold">{section.title}</h2>
        <div className="flex items-center gap-3 text-xs text-gray-600">
          {saving ? <span>Saving…</span> : <span>Saved</span>}
          <CountsBar words={wordCount} chars={charCount} />
        </div>
      </div>
      <RichEditor
        content={html}
        onUpdate={(nextHtml) => {
          setHtml(nextHtml)
          persist(nextHtml)
        }}
      />
    </div>
  )
}
