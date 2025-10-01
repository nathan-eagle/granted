"use client"

import React from "react"
import PageShell from "../../../../components/layout/PageShell"

export default function DocumentsPage({ params }: { params: { id: string } }) {
  const projectId = params.id
  const [uploads, setUploads] = React.useState<any[]>([])
  const [selectedId, setSelectedId] = React.useState<string | null>(null)

  React.useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/uploads?projectId=${projectId}&kind=application`)
      const json = await res.json()
      setUploads(Array.isArray(json.uploads) ? json.uploads : [])
    }
    load()
  }, [projectId])

  async function importFromUpload() {
    if (!selectedId) return
    const res = await fetch(`/api/projects/${projectId}/import-from-upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uploadId: selectedId }),
    })
    const json = await res.json()
    alert(`Imported ${json.count} sections`)
    window.location.href = `/project/${projectId}/draft`
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-4 text-xl font-semibold">Application documents</h1>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-white p-4 md:col-span-1">
            <div className="mb-2 text-sm text-gray-600">Uploads</div>
            <ul className="space-y-2 text-sm">
              {uploads.map((upload: any) => (
                <li key={upload.id}>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="upload"
                      value={upload.id}
                      onChange={() => setSelectedId(upload.id)}
                    />
                    <span className="underline">{upload.filename}</span>
                  </label>
                </li>
              ))}
              {!uploads.length && (
                <li className="text-gray-500">
                  No application files yet. Upload via Materials to import your draft.
                </li>
              )}
            </ul>
            <button
              onClick={importFromUpload}
              disabled={!selectedId}
              className="mt-4 rounded-md bg-[hsl(var(--primary))] px-3 py-2 text-sm text-[hsl(var(--primary-foreground))] disabled:opacity-60"
            >
              Split into sections
            </button>
          </div>
          <div className="rounded-lg border bg-white p-4 md:col-span-2">
            <div className="mb-2 text-sm text-gray-600">Preview</div>
            {selectedId ? (
              <iframe
                src={`/api/uploads/${selectedId}/preview`}
                className="h-[70vh] w-full rounded-md border"
                title="Document preview"
              />
            ) : (
              <div className="text-sm text-gray-500">Select a file to preview.</div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  )
}
