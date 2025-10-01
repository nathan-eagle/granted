"use client"

import React from "react"
import Link from "next/link"
import PageShell from "../../../../components/layout/PageShell"

export default function SetupPage({ params }: { params: { id: string } }) {
  const { id } = params
  const [models, setModels] = React.useState<{ slug: string; name: string }[]>([])
  const [modelSlug, setModelSlug] = React.useState<string>("nsf-sbir-phase-i")
  const [seeding, setSeeding] = React.useState(false)

  React.useEffect(() => {
    async function loadModels() {
      try {
        const res = await fetch("/api/models")
        const json = await res.json()
        const list = (json.models as { slug: string; name: string }[]) || []
        setModels(list)
        if (list.length && !list.find((m) => m.slug === modelSlug)) {
          setModelSlug(list[0].slug)
        }
      } catch (error) {
        console.error("Failed to load models", error)
      }
    }
    loadModels()
  }, [modelSlug])

  async function seedFromModel() {
    if (!modelSlug) return
    setSeeding(true)
    try {
      await fetch(`/api/projects/${id}/seed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelSlug }),
      })
      window.location.href = `/project/${id}/draft`
    } finally {
      setSeeding(false)
    }
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-xl font-semibold">Start your application</h1>

        <div className="rounded-lg border bg-white p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Grant model</label>
            <select
              value={modelSlug}
              onChange={(event) => setModelSlug(event.target.value)}
              className="rounded-md border px-3 py-2 text-sm"
            >
              {models.length === 0 && <option value="">Loading models…</option>}
              {models.map((model) => (
                <option key={model.slug} value={model.slug}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={seedFromModel}
              disabled={seeding || !modelSlug}
              className="rounded-md bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] px-3 py-2 text-sm disabled:opacity-60"
            >
              {seeding ? "Seeding…" : "Use this model"}
            </button>
            <Link href={`/project/${id}/materials`} className="rounded-md border px-3 py-2 text-sm">
              Start from a document (.docx)
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Link
            href={`/project/${id}/draft`}
            className="rounded-lg border bg-white shadow-card p-6 hover:bg-gray-50"
          >
            <div className="text-lg font-semibold mb-2">Blank document</div>
            <p className="text-sm text-gray-600">
              Paste the application text from a web portal and start writing.
            </p>
          </Link>
          <Link
            href={`/project/${id}/materials`}
            className="rounded-lg border bg-white shadow-card p-6 hover:bg-gray-50"
          >
            <div className="text-lg font-semibold mb-2">Start from an existing document</div>
            <p className="text-sm text-gray-600">Upload a .docx application to edit directly.</p>
          </Link>
        </div>
      </div>
    </PageShell>
  )
}

{/* NSF SBIR card */}
<div className="mt-8 grid md:grid-cols-2 gap-6">
  <form action="/api/projects/'${id}'/apply-blueprint" method="post" className="rounded-lg border bg-white shadow-card p-6">
    <div className="text-lg font-semibold mb-2">Apply NSF SBIR Phase I</div>
    <p className="text-sm text-gray-600 mb-4">Seed the outline and prompts.</p>
    <button className="rounded-md bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-sm px-3 py-2">Apply & Open Draft →</button>
  </form>
</div>
