"use client"

import { useState } from "react"

import type { CoverageV1 } from "@/lib/contracts"

export function FixNextPanel({ suggestions }: { suggestions: CoverageV1["suggestions"] }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (!suggestions?.length) {
    return (
      <div className="rounded-md border bg-white p-4 text-sm text-gray-500">
        All key items are covered. Great work!
      </div>
    )
  }

  return (
    <div className="rounded-md border bg-white">
      <header className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Fix next</h3>
        <p className="text-xs text-gray-500">Highest impact actions ordered by value/effort.</p>
      </header>
      <ul className="divide-y text-sm">
        {suggestions.map(item => (
          <li key={item.id} className="px-4 py-3">
            <button
              className="flex w-full items-center justify-between text-left hover:text-[hsl(var(--primary))]"
              onClick={() => setExpanded(current => (current === item.id ? null : item.id))}
            >
              <span className="font-medium">{item.label}</span>
              <span className="text-xs text-gray-500">Value/Effort {item.ratio.toFixed(2)}</span>
            </button>
            {expanded === item.id && (
              <div className="mt-2 space-y-1 text-xs text-gray-600">
                <div>Action type: {item.action}</div>
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
