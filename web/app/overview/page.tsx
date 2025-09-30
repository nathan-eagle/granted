import Link from "next/link"
import PageShell from "../../components/layout/PageShell"

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border rounded-lg shadow-card p-6">
      {title && <h3 className="font-semibold mb-2">{title}</h3>}
      {children}
    </div>
  )
}

export default function OverviewPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-screen-2xl space-y-6">
        <h1 className="text-xl font-semibold">Welcome, Nathan</h1>

        {/* Capabilities */}
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

        {/* Quick Access / Continue Working / Learn */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card title="Quick Access">
            <div className="grid grid-cols-2 gap-4 mt-2">
              <Link href="/projects" className="rounded-md border p-4 hover:bg-gray-50">
                <div className="font-medium">Grants</div>
                <p className="text-sm text-gray-600">Create grants and work on applications</p>
              </Link>
              <Link href="/files" className="rounded-md border p-4 hover:bg-gray-50">
                <div className="font-medium">Files</div>
                <p className="text-sm text-gray-600">Upload and curate files</p>
              </Link>
              <Link href="/profile" className="rounded-md border p-4 hover:bg-gray-50">
                <div className="font-medium">Organization Profile</div>
                <p className="text-sm text-gray-600">Update organization info</p>
              </Link>
              <Link href="/settings" className="rounded-md border p-4 hover:bg-gray-50">
                <div className="font-medium">Settings</div>
                <p className="text-sm text-gray-600">Manage settings</p>
              </Link>
            </div>
          </Card>

          <Card title="Continue Working">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">NSF SBIR</div>
                <div className="text-xs text-gray-600">Last edited recently</div>
              </div>
              <Link
                href="/projects"
                className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
              >
                Go to Grants →
              </Link>
            </div>
          </Card>

          <Card title="Learn">
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              <li>How to use the workspace efficiently</li>
              <li>Best practices for preparing an SBIR</li>
            </ul>
          </Card>
        </section>
      </div>
    </PageShell>
  )
}
