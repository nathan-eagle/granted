import PageShell from "../../components/layout/PageShell"
import Workspace from "@/components/ux2/Workspace"

export const dynamic = "force-dynamic"
export const revalidate = 0

const ux2Enabled = (process.env.UX2_ENABLED ?? "1") !== "0"

export default function OverviewPage() {
  return (
    <PageShell>
      {ux2Enabled ? (
        <Workspace />
      ) : (
        <div className="mx-auto max-w-2xl rounded-lg border bg-white p-8 text-sm text-gray-600">
          <h1 className="text-lg font-semibold text-gray-900">Workspace disabled</h1>
          <p className="mt-2">
            The UX2 workspace is currently turned off. Set <code className="rounded bg-gray-100 px-1 py-0.5">UX2_ENABLED=1</code> and
            <code className="ml-1 rounded bg-gray-100 px-1 py-0.5">NEXT_PUBLIC_UX2_ENABLED=1</code> to enable the Agents SDK prototype.
          </p>
        </div>
      )}
    </PageShell>
  )
}
