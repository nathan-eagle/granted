"use client"

import React from "react"
import Link from "next/link"
import PageShell from "../../../../components/layout/PageShell"

export default function SetupPage({ params }: { params: { id: string } }) {
  const projectId = params.id
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
      await fetch(`/api/projects/${projectId}/seed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelSlug }),
      })
      window.location.href = `/project/${projectId}/draft`
    } finally {
      setSeeding(false)
    }
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-xl font-semibold">Start your application</h1>

        <div className="space-y-4 rounded-lg border bg-white p-6">
          <div>
            <label className="mb-1 block text-sm font-medium">Grant model</label>
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
              className="rounded-md bg-[hsl(var(--primary))] px-3 py-2 text-sm text-[hsl(var(--primary-foreground))] disabled:opacity-60"
            >
              {seeding ? "Seeding…" : "Use this model"}
            </button>
            <Link href={`/project/${projectId}/materials`} className="rounded-md border px-3 py-2 text-sm">
              Start from a document (.docx)
            </Link>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Link
            href={`/project/${projectId}/draft`}
            className="rounded-lg border bg-white p-6 shadow-card hover:bg-gray-50"
          >
            <div className="mb-2 text-lg font-semibold">Blank document</div>
            <p className="text-sm text-gray-600">
              Paste the application text from a web portal and start writing.
            </p>
          </Link>
          <Link
            href={`/project/${projectId}/materials`}
            className="rounded-lg border bg-white p-6 shadow-card hover:bg-gray-50"
          >
            <div className="mb-2 text-lg font-semibold">Start from an existing document</div>
            <p className="text-sm text-gray-600">Upload a .docx application to edit directly.</p>
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <form
            action={`/api/projects/${projectId}/apply-blueprint`}
            method="post"
            className="rounded-lg border bg-white p-6 shadow-card"
          >
            <div className="mb-2 text-lg font-semibold">Apply NSF SBIR Phase I</div>
            <p className="mb-4 text-sm text-gray-600">Seed the outline and prompts in a single click.</p>
            <button className="rounded-md bg-[hsl(var(--primary))] px-3 py-2 text-sm text-[hsl(var(--primary-foreground))]">
              Apply &amp; open draft →
            </button>
          </form>
          <Link
            href={`/project/${projectId}/setup/wizard`}
            className="rounded-lg border bg-white p-6 shadow-card hover:bg-gray-50"
          >
            <div className="mb-2 text-lg font-semibold">Guided setup</div>
            <p className="text-sm text-gray-600">
              Walk the 3-step checklist: apply a blueprint, import your document, and load sources.
            </p>
            <span className="mt-4 inline-flex items-center text-sm text-[hsl(var(--primary))]">
              Open wizard →
            </span>
          </Link>
        </div>
      </div>
    </PageShell>
  )
}
