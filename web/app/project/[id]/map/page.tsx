import Link from "next/link"
import PageShell from "@/components/layout/PageShell"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function MapPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { id: true, name: true }
  })

  const rfps = await prisma.rFP.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, title: true, oppNumber: true, agency: true }
  })

  return (
    <PageShell>
      <div className="mx-auto max-w-3xl space-y-6 py-6">
        <div>
          <h1 className="text-2xl font-semibold">Blueprint mapper</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Align ingested RFP requirements with a writing blueprint. This is an internal helper while we wire the full UI.
          </p>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="space-y-2 text-sm">
            <div>
              <div className="font-medium text-foreground">Project</div>
              <div className="text-muted-foreground">{project ? `${project.name} (${project.id})` : params.id}</div>
            </div>

            <form action="/api/blueprints/map" method="post" className="space-y-3">
              <input type="hidden" name="projectId" value={params.id} />

              <label className="block">
                <span className="text-sm font-medium text-foreground">RFP</span>
                <select name="rfpId" className="mt-1 w-full rounded border px-2 py-1 text-sm">
                  <option value="">Select an ingested RFP…</option>
                  {rfps.map(rfp => (
                    <option key={rfp.id} value={rfp.id}>
                      {rfp.title || rfp.oppNumber || rfp.id}
                      {rfp.agency ? ` — ${rfp.agency}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-foreground">Blueprint</span>
                <select name="blueprintId" defaultValue="nsf_sbir" className="mt-1 w-full rounded border px-2 py-1 text-sm">
                  <option value="nsf_sbir">NSF SBIR Phase I</option>
                </select>
              </label>

              <button
                type="submit"
                className="rounded bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Map requirements → sections
              </button>
            </form>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          <p>After mapping completes, open the draft to see requirements attached to each section.</p>
          <p className="mt-2">
            <Link
              href={`/project/${params.id}/draft`}
              className="text-[hsl(var(--primary))] underline"
            >
              Back to draft editor
            </Link>
          </p>
        </div>
      </div>
    </PageShell>
  )
}
