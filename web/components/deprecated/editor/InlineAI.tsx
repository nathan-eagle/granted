"use client"
import React from "react"

interface InlineAIProps {
  projectId: string
  getSelectedSourceIds?: () => string[]
}

export default function InlineAI({ projectId, getSelectedSourceIds }: InlineAIProps) {
  const [visible, setVisible] = React.useState(false)
  const [pos, setPos] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    const onMouseUp = () => {
      const sel = window.getSelection()
      if (sel && sel.toString().trim().length > 0) {
        const range = sel.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        setPos({ x: rect.left + rect.width / 2, y: rect.top - 8 + window.scrollY })
        setVisible(true)
      } else {
        setVisible(false)
      }
    }
    document.addEventListener("mouseup", onMouseUp)
    return () => document.removeEventListener("mouseup", onMouseUp)
  }, [])

  async function run(kind: "autocomplete" | "rephrase" | "shorten" | "expand") {
    const sel = window.getSelection()
    const text = sel ? sel.toString() : ""
    if (!text) return
    setLoading(true)
    const sourceIds = getSelectedSourceIds?.() || []
    const promptMap = {
      autocomplete: `Draft a focused answer below the selected text.`,
      rephrase: `Rewrite the selected text to improve clarity and flow; keep all facts.`,
      shorten: `Condense the selected text by 30% while preserving essential details.`,
      expand: `Elaborate the selected text with specific, concrete details drawn from sources.`,
    }
    const res = await fetch("/api/ai/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        prompt: `${promptMap[kind]}

Selected:
${text}`,
        sourceIds,
      }),
    })
    const json = await res.json()
    setLoading(false)
    if (json.output) {
      const para = document.createElement("p")
      para.textContent = json.output
      const range = sel?.getRangeAt(0)
      if (range) {
        range.collapse(false)
        range.insertNode(para)
      }
      window.getSelection()?.removeAllRanges()
      setVisible(false)
    }
  }

  if (!visible) return null

  return (
    <div
      className="fixed z-50"
      style={{ left: pos.x, top: pos.y, transform: "translate(-50%, -100%)" }}
    >
      <div className="rounded-md border bg-white shadow-card text-xs">
        <div className="flex divide-x">
          <button onClick={() => run("autocomplete")} className="px-3 py-1 hover:bg-gray-100">
            {loading ? "…" : "Auto-complete"}
          </button>
          <button onClick={() => run("rephrase")} className="px-3 py-1 hover:bg-gray-100">
            Rephrase
          </button>
          <button onClick={() => run("shorten")} className="px-3 py-1 hover:bg-gray-100">
            Shorten
          </button>
          <button onClick={() => run("expand")} className="px-3 py-1 hover:bg-gray-100">
            Expand
          </button>
        </div>
      </div>
    </div>
  )
}
