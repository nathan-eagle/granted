"use client"

import React from "react"
import { toast } from "sonner"
import SectionCard from "@/components/deprecated/editor/SectionCard"
import EditorHeader from "@/components/deprecated/editor/EditorHeader"
import InlineAI from "@/components/deprecated/editor/InlineAI"
import RightRail from "@/components/deprecated/right-rail/RightRail"

async function fetchSectionSources(sectionId: string) {
  try {
    const res = await fetch(`/api/sections/${sectionId}/sources`, { cache: "no-store" })
    if (!res.ok) return []
    const json = await res.json()
    return (json.uploadIds as string[]) || []
  } catch (error) {
    console.error("Failed to load section sources", error)
    return []
  }
}

type Section = {
  id: string
  title: string
  order: number
  contentHtml?: string | null
  wordCount?: number | null
  limitWords?: number | null
}

export default function DraftEditorClient({ projectId }: { projectId: string }) {
  const [sections, setSections] = React.useState<Section[]>([])
  const [activeSectionId, setActiveSectionId] = React.useState<string | null>(null)
  const [selectedSources, setSelectedSources] = React.useState<string[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [addingSection, setAddingSection] = React.useState(false)

  const loadSections = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/sections`, { cache: "no-store" })
      if (!res.ok) throw new Error(`Failed to load sections (${res.status})`)
      const json = await res.json().catch(() => ({ sections: [] }))
      let data: Section[] = Array.isArray(json.sections) ? json.sections : []

      if (!data.length) {
        const createRes = await fetch(`/api/projects/${projectId}/sections`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Specific Aims" }),
        })
        if (!createRes.ok) throw new Error(`Failed to create default section (${createRes.status})`)

        const res2 = await fetch(`/api/projects/${projectId}/sections`, { cache: "no-store" })
        if (!res2.ok) throw new Error(`Failed to refresh sections (${res2.status})`)
        const json2 = await res2.json().catch(() => ({ sections: [] }))
        data = Array.isArray(json2.sections) ? json2.sections : []
      }

      setSections(data)
      const firstId = data[0]?.id || null
      setActiveSectionId(firstId)
      if (firstId) {
        const sources = await fetchSectionSources(firstId)
        setSelectedSources(sources)
      } else {
        setSelectedSources([])
      }
    } catch (err) {
      console.error("Failed to load sections", err)
      setSections([])
      setActiveSectionId(null)
      setSelectedSources([])
      setError("We couldn't load your sections. Refresh the page or try again in a moment.")
    } finally {
      setLoading(false)
    }
  }, [projectId])

  React.useEffect(() => {
    loadSections()
  }, [loadSections])

  React.useEffect(() => {
    if (!activeSectionId) return
    fetchSectionSources(activeSectionId)
      .then(setSelectedSources)
      .catch(() => setSelectedSources([]))
  }, [activeSectionId])

  const activeSection = sections.find((s) => s.id === activeSectionId) || null

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <EditorHeader projectId={projectId} />
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">Outline</span>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-12 gap-4">
        <aside className="col-span-3 rounded-lg border bg-white p-4 overflow-y-auto">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Sections</h3>
            <span className="text-xs text-gray-500">{sections.length}</span>
          </div>
          <ul className="space-y-1 text-sm">
            {sections.map((section) => (
              <li key={section.id}>
                <button
                  onClick={() => setActiveSectionId(section.id)}
                  className={`w-full rounded-md px-2 py-1 text-left hover:bg-gray-50 ${activeSectionId === section.id ? "bg-gray-100" : ""}`}
                >
                  {section.order + 1}. {section.title}
                </button>
              </li>
            ))}
          </ul>
          <button
            onClick={async () => {
              if (addingSection) return
              setAddingSection(true)
              try {
                const res = await fetch(`/api/projects/${projectId}/sections`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ title: "New section" }),
                })
                if (!res.ok) throw new Error(`Failed to add section (${res.status})`)
                await loadSections()
              } catch (err) {
                console.error("Failed to add section", err)
                toast.error("Couldn't add a section. Please try again.")
              } finally {
                setAddingSection(false)
              }
            }}
            className="mt-3 rounded-md border px-2 py-1 text-sm disabled:opacity-60"
            disabled={addingSection}
          >
            {addingSection ? "Adding…" : "+ Add section"}
          </button>
        </aside>

        <section className="col-span-6 overflow-y-auto rounded-lg border bg-white">
          <div className="space-y-6 p-4">
            {loading && <div className="text-sm text-gray-500">Loading sections…</div>}
            {!loading && activeSection && (
              <SectionCard
                section={activeSection}
                onChanged={(updated) => {
                  setSections((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)))
                }}
              />
            )}
            {!loading && !activeSection && (
              <div className="text-sm text-gray-500">No sections yet.</div>
            )}
          </div>
          {activeSection && (
            <div className="px-4 pb-6">
              <InlineAI projectId={projectId} getSelectedSourceIds={() => selectedSources} />
            </div>
          )}
        </section>

        <aside className="col-span-3 rounded-lg border bg-white p-4 overflow-y-auto">
          <RightRail
            projectId={projectId}
            onSourcesChange={async (ids) => {
              setSelectedSources(ids)
              if (activeSectionId) {
                await fetch(`/api/sections/${activeSectionId}/sources`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ uploadIds: ids }),
                })
              }
            }}
          />
        </aside>
      </div>
    </div>
  )
}
