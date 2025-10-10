"use client"

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import type { CoverageV1 } from "@/lib/contracts"

type Suggestion = NonNullable<CoverageV1["suggestions"]>[number]

async function applySuggestion(projectId: string, suggestion: Suggestion) {
  const response = await fetch("/api/autopilot/suggestion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, suggestion }),
  })
  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(text || `Failed to apply suggestion (${response.status})`)
  }
  return response.json().catch(() => ({}))
}

export function FixNextPanel({ projectId, suggestions }: { projectId: string; suggestions: CoverageV1["suggestions"] }) {
  const router = useRouter()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!suggestions?.length) {
    return (
      <div className="rounded-md border bg-white p-4 text-sm text-gray-500">
        All key items are covered. Great work!
      </div>
    )
  }

  const handleApply = async (suggestion: Suggestion) => {
    setBusyId(suggestion.id)
    setError(null)
    try {
      await applySuggestion(projectId, suggestion)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="rounded-md border bg-white">
      <header className="border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Fix next</h3>
            <p className="text-xs text-gray-500">Highest impact actions ordered by value/effort.</p>
          </div>
          {busyId && <span className="text-xs text-[hsl(var(--primary))]">Running…</span>}
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </header>
      <ul className="divide-y text-sm">
        {suggestions.map(item => (
          <li key={item.id} className="px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <button
                className="flex-1 text-left font-medium hover:text-[hsl(var(--primary))]"
                onClick={() => setExpanded(current => (current === item.id ? null : item.id))}
              >
                {item.label}
              </button>
              <span className="text-xs text-gray-500">{item.ratio.toFixed(2)} V/E</span>
              <button
                type="button"
                disabled={busyId === item.id || item.action !== "draft"}
                onClick={() => handleApply(item)}
                className={`rounded-md border px-3 py-1 text-xs font-medium disabled:opacity-50 ${
                  item.action === "draft"
                    ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/10"
                    : "border-gray-200 text-gray-400"
                }`}
              >
                {item.action === "draft" ? "Apply" : "Manual"}
              </button>
            </div>
            {expanded === item.id && (
              <div className="mt-2 space-y-1 text-xs text-gray-600">
                <div>Action: {item.action}</div>
                <div>Requirement: {item.requirementId}</div>
                <div>Value score: {item.value_score.toFixed(2)}</div>
                <div>Effort score: {item.effort_score.toFixed(2)}</div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
