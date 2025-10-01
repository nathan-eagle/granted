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
    <div className="sticky top-0 z-10 bg-white/70 backdrop-blur border-b px-4 py-2 flex items-center gap-2">
      <button onClick={run} className="rounded-md bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-sm px-3 py-2">Run Autopilot</button>
      <a href={`/api/projects/${projectId}/export/docx`} className="rounded-md border text-sm px-3 py-2">Export DOCX</a>
    </div>
  )
}
