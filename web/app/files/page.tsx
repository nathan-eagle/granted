"use client"
import PageShell from "../../components/layout/PageShell"
import React from "react"

export default function FilesPage() {
  const [uploads, setUploads] = React.useState<any[]>([])
  const [file, setFile] = React.useState<File | null>(null)
  const [projectId, setProjectId] = React.useState<string>("") // optional
  const [loading, setLoading] = React.useState(false)

  async function refresh() {
    const query = new URLSearchParams()
    if (projectId) query.set("projectId", projectId)
    else return // require project context for now
    query.set("kind", "source")
    const res = await fetch(`/api/uploads?${query.toString()}`)
    const json = await res.json()
    setUploads(json.uploads || [])
  }

  async function onUpload() {
    if (!file || !projectId) return
    const fd = new FormData()
    fd.append("projectId", projectId)
    fd.append("kind", "source")
    fd.append("file", file)
    setLoading(true)
    await fetch("/api/uploads", { method: "POST", body: fd })
    setLoading(false)
    setFile(null)
    refresh()
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-xl font-semibold">Files</h1>
        <div className="rounded-lg border bg-white p-4 flex flex-wrap gap-3 items-center">
          <input placeholder="Project ID" value={projectId} onChange={e=>setProjectId(e.target.value)} className="rounded-md border px-3 py-2 text-sm" />
          <input type="file" accept=".docx,.txt,.md,.pdf" onChange={e=>setFile(e.target.files?.[0] || null)} />
          <button onClick={onUpload} disabled={!file || !projectId || loading} className="rounded-md bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] px-3 py-2 text-sm disabled:opacity-60">{loading ? "Uploading..." : "Upload as Source"}</button>
          <button onClick={refresh} disabled={!projectId} className="rounded-md border px-3 py-2 text-sm">Refresh</button>
        </div>

        <div className="rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr><th className="text-left font-medium px-4 py-3">Filename</th><th className="text-left font-medium px-4 py-3">Words</th></tr>
            </thead>
            <tbody>
              {uploads.map(u => (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-3">{u.filename}</td>
                  <td className="px-4 py-3 text-gray-500">{u.text ? u.text.split(/\s+/).length : "—"}</td>
                </tr>
              ))}
              {!uploads.length && <tr><td className="px-4 py-6 text-gray-500" colSpan={2}>No source files yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  )
}
