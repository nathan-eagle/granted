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
          <Card>
            <div className="text-lg font-semibold mb-1">Start writing a document</div>
            <p className="text-sm text-gray-600">Start writing LOIs, emails, reports, and other documents</p>
          </Card>
          <Card>
            <div className="text-lg font-semibold mb-1">Work on an Application</div>
            <p className="text-sm text-gray-600">Create and refine grant proposals with AI assistance</p>
          </Card>
          <Card>
            <div className="text-lg font-semibold mb-1">Explore Funders</div>
            <p className="text-sm text-gray-600">Discover funding opportunities that match your mission</p>
          </Card>
        </section>

        {/* Quick Access / Continue Working / Learn */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card title="Quick Access">
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="rounded-md border p-4">
                <div className="font-medium">Grants</div>
                <p className="text-sm text-gray-600">Create grants and work on applications</p>
              </div>
              <div className="rounded-md border p-4">
                <div className="font-medium">Files</div>
                <p className="text-sm text-gray-600">Upload and curate files</p>
              </div>
              <div className="rounded-md border p-4">
                <div className="font-medium">Organization Profile</div>
                <p className="text-sm text-gray-600">Update organization info</p>
              </div>
              <div className="rounded-md border p-4">
                <div className="font-medium">Settings</div>
                <p className="text-sm text-gray-600">Manage settings</p>
              </div>
            </div>
          </Card>

          <Card title="Continue Working">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">NSF SBIR</div>
                <div className="text-xs text-gray-600">Last edited recently</div>
              </div>
              <button className="rounded-md border px-3 py-2 text-sm">Go to Grants →</button>
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
