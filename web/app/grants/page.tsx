import PageShell from "@/components/layout/PageShell"
import { prisma } from "@/lib/prisma"

export default async function GrantsPage() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: { projectMeta: true },
  })

  return (
    <PageShell>
      <div className="mx-auto max-w-screen-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Grants</h1>
          <a
            className="rounded-md bg-[hsl(var(--primary))] px-3 py-2 text-sm text-[hsl(var(--primary-foreground))]"
            href="/projects"
          >
            + New Grant
          </a>
        </div>
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Due date</th>
                <th className="px-4 py-3 text-left font-medium">Amounts</th>
                <th className="px-4 py-3 text-left font-medium">Funder</th>
                <th className="px-4 py-3 text-left font-medium">Programs</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => {
                const meta = project.projectMeta
                const due = meta?.dueDate ? new Date(meta.dueDate).toLocaleDateString() : "—"
                const amounts = meta?.amountRequested
                  ? `${meta.amountRequested}${meta?.amountAwarded ? ` / ${meta.amountAwarded}` : ""}`
                  : meta?.amountAwarded || "—"
                return (
                  <tr key={project.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <a className="underline" href={`/project/${project.id}/draft`}>
                        {project.name}
                      </a>
                    </td>
                    <td className="px-4 py-3">{meta?.status || project.status || "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{due}</td>
                    <td className="px-4 py-3 text-gray-500">{amounts}</td>
                    <td className="px-4 py-3 text-gray-500">{meta?.funder || "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{meta?.programs || "—"}</td>
                    <td className="px-4 py-3">
                      <a className="rounded-md border px-2 py-1 text-sm" href={`/project/${project.id}/setup/wizard`}>
                        Setup
                      </a>
                    </td>
                  </tr>
                )
              })}
              {!projects.length && (
                <tr>
                  <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={7}>
                    No grants yet. Create one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  )
}
