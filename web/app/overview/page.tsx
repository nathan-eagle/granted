import Link from "next/link"

import PageShell from "../../components/layout/PageShell"
import Workspace from "@/components/ux2/Workspace"

export const dynamic = "force-dynamic"
export const revalidate = 0

function LegacyDashboard() {
  return (
    <div className="mx-auto max-w-screen-2xl space-y-6">
      <h1 className="text-xl font-semibold">Welcome back</h1>
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/projects" className="block rounded-lg border bg-white shadow-card p-6 hover:bg-gray-50">
          <div className="text-lg font-semibold mb-1">Start writing a document</div>
          <p className="text-sm text-gray-600">Create a project and open the AI-assisted editor.</p>
        </Link>
        <Link href="/projects" className="block rounded-lg border bg-white shadow-card p-6 hover:bg-gray-50">
          <div className="text-lg font-semibold mb-1">Work on an Application</div>
          <p className="text-sm text-gray-600">Seed grant sections from a model or continue drafting.</p>
        </Link>
        <Link href="/files" className="block rounded-lg border bg-white shadow-card p-6 hover:bg-gray-50">
          <div className="text-lg font-semibold mb-1">Explore Funders</div>
          <p className="text-sm text-gray-600">Review uploaded materials and source libraries.</p>
        </Link>
      </section>
    </div>
  )
}

export default function OverviewPage() {
  const useUx2 =
    process.env["UX2_REV3"] === "1" || process.env["NEXT_PUBLIC_UX2_REV3"] === "1"

  return <PageShell>{useUx2 ? <Workspace /> : <LegacyDashboard />}</PageShell>
}
