"use client"

import { useState } from "react"

async function resolveConflict(projectId: string, key: string, resolution: string) {
  await fetch("/api/conflicts/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, key, resolution }),
  })
}

export type ConflictLogEntry = {
  type: string
  key: string
  previous?: Record<string, unknown>
  next?: Record<string, unknown>
  resolved?: string
  projectId?: string
}

export function ConflictLogDrawer({ entries }: { entries: ConflictLogEntry[] }) {
  const [open, setOpen] = useState(false)

  if (!entries.length) {
    return (
      <div className="rounded-md border bg-white p-4 text-sm text-gray-500">
        No conflicts detected in the current bundle.
      </div>
    )
  }

  return (
    <div className="rounded-md border bg-white">
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold"
        onClick={() => setOpen(v => !v)}
      >
        Conflict log
        <span className="text-xs text-gray-500">{entries.length} items</span>
      </button>
      {open && (
        <div className="max-h-64 space-y-3 overflow-y-auto px-4 py-3 text-xs text-gray-600">
          {entries.map((entry, index) => (
            <details key={`${entry.key}-${index}`} className="rounded border px-3 py-2">
              <summary className="cursor-pointer font-medium">{entry.key}</summary>
              <div className="mt-2 space-y-2">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-gray-400">Previous</div>
                  <pre className="whitespace-pre-wrap break-words text-[11px]">{JSON.stringify(entry.previous ?? {}, null, 2)}</pre>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-gray-400">Latest</div>
                  <pre className="whitespace-pre-wrap break-words text-[11px]">{JSON.stringify(entry.next ?? {}, null, 2)}</pre>
                </div>
                <div className="flex gap-2 pt-2 text-xs">
                  <button
                    className="rounded border px-2 py-1 hover:bg-gray-100"
                    onClick={() => resolveConflict(entry.projectId ?? "", entry.key, "latest")}
                  >
                    Accept latest
                  </button>
                  <button
                    className="rounded border px-2 py-1 hover:bg-gray-100"
                    onClick={() => resolveConflict(entry.projectId ?? "", entry.key, "previous")}
                  >
                    Keep previous
                  </button>
                  {entry.resolved && <span className="ml-auto text-green-600">Resolved: {entry.resolved}</span>}
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  )
}
