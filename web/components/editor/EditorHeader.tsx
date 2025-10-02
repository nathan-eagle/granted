"use client"
import React from "react"
import { toast } from "sonner"

export default function EditorHeader({ projectId }: { projectId: string }) {
  async function run() {
    toast("Autopilot started…")
    const res = await fetch(`/api/projects/${projectId}/autopilot`, { method: "POST", headers: { "Content-Type":"application/json" }, body: JSON.stringify({ variables: {} }) })
    const json = await res.json()
    if (json?.ok) toast.success(`Autopilot filled ${json.updated} sections`)
    else toast.error("Autopilot failed")
  }
  return (
    <div className="sticky top-0 z-10 flex w-full justify-end gap-2 px-4 pt-2">
      <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-white/90 px-3 py-2 shadow-sm">
        <button
          onClick={run}
          className="rounded-md bg-[hsl(var(--primary))] px-3 py-2 text-sm text-[hsl(var(--primary-foreground))]"
        >
          Run Autopilot
        </button>
        <a href={`/api/projects/${projectId}/export/docx`} className="rounded-md border px-3 py-2 text-sm">
          Export DOCX
        </a>
      </div>
    </div>
  )
}
