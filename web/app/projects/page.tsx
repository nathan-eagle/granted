import PageShell from "../../components/layout/PageShell"
import GrantsTable from "../../components/grants/GrantsTable"

export default function ProjectsPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-screen-2xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Grants</h1>
          <button className="rounded-md bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-sm px-3 py-2 hover:opacity-90">
            + New Grant
          </button>
        </div>
        <GrantsTable />
      </div>
    </PageShell>
  )
}
