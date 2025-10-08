"use client"

import { useState } from "react"

import type { Upload } from "@prisma/client"

type SourceRow = Upload & { trusted?: boolean }

export function SourcesPanel({ uploads }: { uploads: SourceRow[] }) {
  const [state, setState] = useState(() => uploads.map(upload => ({ id: upload.id, trusted: true })))

  const toggleTrust = (id: string) => {
    setState(current =>
      current.map(entry => (entry.id === id ? { ...entry, trusted: !entry.trusted } : entry))
    )
    // TODO: persist trust toggle via API when backend wiring is available.
  }

  return (
    <div className="rounded-lg border bg-white">
      <header className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Sources</h3>
        <p className="text-xs text-gray-500">Parsed ▸ Mined ▸ Used</p>
      </header>
      <ul className="divide-y text-sm">
        {uploads.map(upload => {
          const trustState = state.find(entry => entry.id === upload.id)
          const trusted = trustState?.trusted ?? true
          return (
            <li key={upload.id} className="px-4 py-3">
              <div className="font-medium">{upload.filename}</div>
              <div className="text-xs text-gray-500">
                {upload.kindDetail ?? upload.kind} · {upload.createdAt.toLocaleDateString()}
              </div>
              <button
                onClick={() => toggleTrust(upload.id)}
                className={`mt-2 rounded-full border px-3 py-1 text-xs ${
                  trusted ? "border-green-500 text-green-600" : "border-gray-300 text-gray-500"
                }`}
              >
                {trusted ? "Trusted" : "Excluded"}
              </button>
            </li>
          )
        })}
        {uploads.length === 0 && (
          <li className="px-4 py-3 text-sm text-gray-500">No sources ingested yet.</li>
        )}
      </ul>
    </div>
  )
}
