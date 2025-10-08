import { prisma } from "@/lib/prisma"
import type { CoverageV1 } from "@/lib/contracts"
import { ConflictLogDrawer } from "./ConflictLogDrawer"
import { ConversationPanel } from "./ConversationPanel"
import { FixNextPanel } from "./FixNextPanel"
import { SourcesPanel } from "./SourcesPanel"
import { CompliancePanel } from "./CompliancePanel"

export default async function Workspace() {
  const project = await prisma.project.findFirst({
    orderBy: { createdAt: "desc" },
    include: {
      uploads: { orderBy: { createdAt: "desc" } },
      sections: { orderBy: { order: "asc" } },
    },
  })

  if (!project) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 rounded-md border border-dashed bg-white p-12 text-center text-sm text-gray-600">
        <div className="text-base font-semibold text-gray-800">No projects yet</div>
        <p className="max-w-md text-gray-600">
          Create a project to unlock the drafting workspace. Once a draft exists, uploaded materials and coverage insights will appear here.
        </p>
        <a
          href="/projects/new"
          className="inline-flex items-center justify-center rounded-md bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:opacity-90"
        >
          Start a project
        </a>
      </div>
    )
  }

  const coverage = project.coverageJson as CoverageV1 | null
  const conflictEntries = Array.isArray(project.conflictLogJson)
    ? (project.conflictLogJson as any[]).map(entry => ({ ...entry, projectId: project.id }))
    : []
  const eligibility = (project.eligibilityJson as any)?.items ?? []
  const hasFatal = eligibility.some((item: any) => item?.fatal)

  return (
    <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-[280px_1fr_320px]">
      <aside className="space-y-4">
        <SourcesPanel uploads={project.uploads} />
        <ConflictLogDrawer entries={conflictEntries} />
      </aside>

      <section className="flex h-full flex-col space-y-4">
        {hasFatal && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Eligibility warning: confirm the items below before investing more drafting time.
            <ul className="mt-2 list-disc pl-4 text-xs text-red-600">
              {eligibility.map((item: any) => (
                <li key={item.id}>{item.text}</li>
              ))}
            </ul>
          </div>
        )}
        <ConversationPanel projectName={project.name} coverage={coverage ?? null} />
        {coverage?.suggestions && <FixNextPanel suggestions={coverage.suggestions} />}
      </section>

     <aside className="space-y-4">
       <CompliancePanel sections={project.sections} />
       {coverage && (
         <div className="rounded-md border bg-white p-4 text-sm">
           <div className="text-xs uppercase text-gray-400">Coverage</div>
           <div className="mt-1 text-2xl font-semibold">{Math.round(coverage.score * 100)}%</div>
            <div className="mt-3 space-y-2">
              {coverage.requirements.map(req => (
                <div key={req.id} className="flex items-center justify-between text-xs">
                  <span>{req.id}</span>
                  <span
                    className={
                      req.status === "drafted"
                        ? "text-green-600"
                        : req.status === "stubbed"
                        ? "text-amber-600"
                        : "text-red-600"
                    }
                  >
                    {req.status}
                  </span>
                </div>
              ))}
            </div>
         </div>
       )}
        <a
          href="mailto:feedback@grantedai.com"
          className="block rounded-md border border-dashed bg-white px-4 py-3 text-center text-xs text-gray-600 hover:border-gray-400"
        >
          Give feedback on this workspace →
        </a>
      </aside>
    </div>
  )
}
