import PageShell from "../../components/layout/PageShell"
import Workspace from "@/components/ux2/Workspace"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default function OverviewPage() {
  return (
    <PageShell>
      <Workspace />
    </PageShell>
  )
}
