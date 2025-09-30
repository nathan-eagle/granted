import { prisma } from "@/lib/prisma"
import PageShell from "../../components/layout/PageShell"
import NewGrantDialog from "../../components/projects/NewGrantDialog"

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
  })
  return (
    <PageShell>
      <div className="mx-auto max-w-screen-2xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Grants</h1>
          <NewGrantDialog />
        </div>

        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left font-medium px-4 py-3">Name</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-left font-medium px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {projects?.map((p: any) => (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3"><a className="underline" href={`/project/${p.id}/draft`}>{p.name}</a></td>
                  <td className="px-4 py-3">{p.status || "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(p.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {!projects?.length && <tr><td className="px-4 py-6 text-gray-500" colSpan={3}>No grants yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  )
}
