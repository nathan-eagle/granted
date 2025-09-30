"use client"

import React from "react"
import SectionCard from "../../../../components/editor/SectionCard"
import InlineAI from "../../../../components/editor/InlineAI"
import RightRail from "../../../../components/right-rail/RightRail"

async function fetchSectionSources(sectionId: string) {
  const res = await fetch(`/api/sections/${sectionId}/sources`, { cache: "no-store" })
  if (!res.ok) return []
  const json = await res.json()
  return (json.uploadIds as string[]) || []
}

type Section = {
  id: string
  title: string
  order: number
  contentHtml?: string | null
  wordCount?: number | null
}

export default function DraftEditorClient({ projectId }: { projectId: string }) {
  const [sections, setSections] = React.useState<Section[]>([])
  const [activeSectionId, setActiveSectionId] = React.useState<string | null>(null)
  const [selectedSources, setSelectedSources] = React.useState<string[]>([])
  const [loading, setLoading] = React.useState(true)

  const loadSections = React.useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/projects/${projectId}/sections`, { cache: "no-store" })
    const json = await res.json()
    let data: Section[] = json.sections || []
    if (!data.length) {
      await fetch(`/api/projects/${projectId}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Specific Aims" }),
      })
      const res2 = await fetch(`/api/projects/${projectId}/sections`, { cache: "no-store" })
      const json2 = await res2.json()
      data = json2.sections || []
    }
    setSections(data)
    const firstId = data[0]?.id || null
    setActiveSectionId(firstId)
    if (firstId) {
      setSelectedSources(await fetchSectionSources(firstId))
    } else {
      setSelectedSources([])
    }
    setLoading(false)
  }, [projectId])

  React.useEffect(() => {
    loadSections()
  }, [loadSections])

  React.useEffect(() => {
    if (!activeSectionId) return
    fetchSectionSources(activeSectionId).then(setSelectedSources)
  }, [activeSectionId])

  const activeSection = sections.find((s) => s.id === activeSectionId) || null

  return (
    <div className="grid grid-cols-12 gap-4 h-[calc(100vh-5rem)]">
      <aside className="col-span-3 rounded-lg border bg-white p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Outline</h3>
          <span className="text-xs text-gray-500">{sections.length} sections</span>
        </div>
        <ul className="space-y-1 text-sm">
          {sections.map((section) => (
            <li key={section.id}>
              <button
                onClick={() => setActiveSectionId(section.id)}
                className={`w-full text-left rounded-md px-2 py-1 hover:bg-gray-50 ${activeSectionId === section.id ? "bg-gray-100" : ""}`}
              >
                {section.order + 1}. {section.title}
              </button>
            </li>
          ))}
        </ul>
        <button
          onClick={async () => {
            await fetch(`/api/projects/${projectId}/sections`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title: "New section" }),
            })
            loadSections()
          }}
          className="mt-3 text-sm rounded-md border px-2 py-1"
        >
          + Add section
        </button>
      </aside>

      <section className="col-span-6 overflow-y-auto">
        <div className="p-4 space-y-6">
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
  )
}
