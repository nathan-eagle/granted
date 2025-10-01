"use client"

import React from "react"
import { toast } from "sonner"
import PageShell from "../../../../../components/layout/PageShell"

const BLUEPRINT_OPTIONS = [{ slug: "nsf-sbir-phase-i", label: "NSF SBIR Phase I" }]

export default function SetupWizardPage({ params }: { params: { id: string } }) {
  const projectId = params.id
  const [step, setStep] = React.useState(1)
  const [blueprintSlug, setBlueprintSlug] = React.useState(BLUEPRINT_OPTIONS[0].slug)
  const [busy, setBusy] = React.useState(false)

  async function applyBlueprint() {
    setBusy(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/apply-blueprint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: blueprintSlug }),
      })
      if (!res.ok) throw new Error("Blueprint failed")
      toast.success("Outline seeded")
      setStep(2)
    } catch (error) {
      console.error(error)
      toast.error("Couldn't apply the blueprint")
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageShell>
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold">Grant Setup</h1>
          <p className="text-sm text-gray-600">Complete these quick steps to prepare the workspace.</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((value) => (
            <div
              key={value}
              className={`h-2 rounded-full ${value <= step ? "bg-[hsl(var(--primary))]" : "bg-gray-200"}`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="rounded-lg border bg-white p-6 shadow-card">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">1. Choose a blueprint</h2>
              <p className="text-sm text-gray-600">Seed a ready-to-edit outline with prompts and targets.</p>
            </div>
            <select
              value={blueprintSlug}
              onChange={(event) => setBlueprintSlug(event.target.value)}
              className="rounded-md border px-3 py-2 text-sm"
            >
              {BLUEPRINT_OPTIONS.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="mt-6 flex justify-end">
              <button
                onClick={applyBlueprint}
                disabled={busy}
                className="rounded-md bg-[hsl(var(--primary))] px-3 py-2 text-sm text-[hsl(var(--primary-foreground))] disabled:opacity-60"
              >
                {busy ? "Seeding…" : "Apply blueprint"}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="rounded-lg border bg-white p-6 shadow-card">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">2. Upload your application</h2>
              <p className="text-sm text-gray-600">
                Drop your .docx in Materials, then split it into sections from the Documents view.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a className="rounded-md border px-3 py-2 text-sm" href={`/project/${projectId}/materials`}>
                Go to Materials
              </a>
              <a className="rounded-md border px-3 py-2 text-sm" href={`/project/${projectId}/documents`}>
                Preview & Split
              </a>
            </div>
            <div className="mt-6 flex justify-between">
              <button onClick={() => setStep(1)} className="rounded-md border px-3 py-2 text-sm">
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="rounded-md bg-[hsl(var(--primary))] px-3 py-2 text-sm text-[hsl(var(--primary-foreground))]"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="rounded-lg border bg-white p-6 shadow-card">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">3. Add supporting sources</h2>
              <p className="text-sm text-gray-600">
                Upload prior grants, boilerplate, or reference material to ground the AI assistant.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a className="rounded-md border px-3 py-2 text-sm" href="/files">
                Open Files
              </a>
              <a className="rounded-md border px-3 py-2 text-sm" href={`/project/${projectId}/draft`}>
                Start writing
              </a>
            </div>
            <div className="mt-6 flex justify-start">
              <button onClick={() => setStep(2)} className="rounded-md border px-3 py-2 text-sm">
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  )
}
