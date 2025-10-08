import { prisma } from "@/lib/prisma"
import type { CoverageV1 } from "@/lib/contracts"
import { ConflictLogDrawer } from "./ConflictLogDrawer"
import { SourcesPanel } from "./SourcesPanel"
import { CompliancePanel } from "./CompliancePanel"

const API_BASE = process.env.APP_URL ?? "http://localhost:3000"

export default async function Workspace() {
  const project = await prisma.project.findFirst({
    orderBy: { createdAt: "desc" },
    include: {
      uploads: { orderBy: { createdAt: "desc" } },
      sections: { orderBy: { order: "asc" } },
      conflictLogs: { where: { status: "open" }, orderBy: { createdAt: "desc" } },
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
  const suggestions = (coverage?.suggestions as any[]) ?? []

  return (
    <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-[280px_1fr_320px]">
      <aside className="space-y-4">
        <SourcesPanel uploads={project.uploads} />
        <ConflictLogDrawer
          entries={project.conflictLogs.map(entry => ({
            type: "conflict",
            key: entry.key,
            previous: entry.previous as Record<string, unknown> | undefined,
            next: entry.next as Record<string, unknown> | undefined,
            resolved: entry.resolution ?? undefined,
            projectId: project.id,
          }))}
        />
      </aside>

      <section className="flex h-full flex-col space-y-4">
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-gray-900">Agents SDK prototype</h1>
          <p className="mt-2 text-sm text-gray-600">
            Interact with the Granted agent via the HTTP endpoints below. The API persists transcripts, memory ids, and tool logs so you can drive
            the workflow entirely from code or CLI scripts.
          </p>
          <div className="mt-4 space-y-4 text-sm">
            <div>
              <div className="font-medium text-gray-800">Start a session</div>
              <pre className="mt-1 overflow-x-auto rounded bg-gray-900 p-3 text-xs text-gray-100">
{`curl -X POST ${API_BASE}/api/agent/session \\
  -H 'Content-Type: application/json' \\
  -d '{
    "projectId": "${project.id}",
    "messages": [
      { "role": "system", "content": "You are a helpful assistant." },
      { "role": "user", "content": "What should I do first?" }
    ]
  }'`}
              </pre>
            </div>
            <div>
              <div className="font-medium text-gray-800">Continue a session</div>
              <pre className="mt-1 overflow-x-auto rounded bg-gray-900 p-3 text-xs text-gray-100">
{`curl -X POST ${API_BASE}/api/agent/session/{sessionId} \\
  -H 'Content-Type: application/json' \\
  -d '{
    "messages": [
      { "role": "user", "content": "Thanks!" }
    ]
  }'`}
              </pre>
            </div>
            <div>
              <div className="font-medium text-gray-800">Upload materials programmatically</div>
              <pre className="mt-1 overflow-x-auto rounded bg-gray-900 p-3 text-xs text-gray-100">
{`curl -X POST ${API_BASE}/api/autopilot/upload \\
  -F projectId=${project.id} \\
  -F file=@path/to/rfp.pdf \\
  -F sessionId={sessionId}`}
              </pre>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            Tip: Run <code className="rounded bg-gray-100 px-1 py-0.5">npm run verify:ux2</code> to execute the smoke checks and sample API calls.
          </p>
        </div>

        {suggestions.length > 0 && (
          <div className="rounded-lg border bg-white p-4 text-sm">
            <div className="text-xs uppercase text-gray-400">Fix-next suggestions</div>
            <ul className="mt-2 space-y-2">
              {suggestions.slice(0, 5).map(item => (
                <li key={item.id} className="flex items-center justify-between text-xs text-gray-700">
                  <span>{item.label}</span>
                  <span className="text-gray-500">{item.action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
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
                      req.status === 'drafted'
                        ? 'text-green-600'
                        : req.status === 'stubbed'
                        ? 'text-amber-600'
                        : 'text-red-600'
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
          Give feedback on this prototype →
        </a>
      </aside>
    </div>
  )
}
