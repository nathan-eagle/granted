"use client"
import PageShell from "../../../../components/layout/PageShell"
import React from "react"

export default function MaterialsPage({ params }: { params: { id: string } }) {
  const { id } = params
  const [uploads, setUploads] = React.useState<any[]>([])
  const [file, setFile] = React.useState<File | null>(null)
  const [loading, setLoading] = React.useState(false)

  const refresh = React.useCallback(async () => {
    const res = await fetch(`/api/uploads?projectId=${id}&kind=application`)
    const json = await res.json()
    setUploads(json.uploads || [])
  }, [id])
  React.useEffect(() => {
    refresh()
  }, [refresh])

  async function onUpload() {
    if (!file) return
    const fd = new FormData()
    fd.append("projectId", id)
    fd.append("kind", "application")
    fd.append("file", file)
    setLoading(true)
    await fetch("/api/uploads", { method: "POST", body: fd })
    setLoading(false)
    setFile(null)
    refresh()
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-xl font-semibold">Application materials</h1>
        <div className="rounded-lg border bg-white p-6">
          <input type="file" accept=".docx,.txt,.md,.pdf" onChange={e=>setFile(e.target.files?.[0] || null)} />
          <button onClick={onUpload} disabled={!file || loading} className="ml-3 rounded-md bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] px-3 py-2 text-sm disabled:opacity-60">{loading ? "Uploading..." : "Upload"}</button>
        </div>
        <div className="rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr><th className="text-left font-medium px-4 py-3">Filename</th><th className="text-left font-medium px-4 py-3">Words</th><th className="px-4 py-3"></th></tr>
            </thead>
            <tbody>
              {uploads.map(u => (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-3">{u.filename}</td>
                  <td className="px-4 py-3 text-gray-500">{u.text ? u.text.split(/\s+/).length : "—"}</td>
                  <td className="px-4 py-3 text-right"><a className="underline" href={`/project/${id}/draft`}>Open editor →</a></td>
                </tr>
              ))}
              {!uploads.length && <tr><td className="px-4 py-6 text-gray-500" colSpan={3}>No files yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  )
}
