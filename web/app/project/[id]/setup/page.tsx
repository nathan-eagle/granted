import PageShell from "../../../../components/layout/PageShell"
import Link from "next/link"

export default function SetupPage({ params }: { params: { id: string } }) {
  const { id } = params
  return (
    <PageShell>
      <div className="mx-auto max-w-4xl">
        <h1 className="text-xl font-semibold mb-4">Start your application</h1>
        <div className="grid md:grid-cols-2 gap-6">
          <Link href={`/project/${id}/draft`} className="rounded-lg border bg-white shadow-card p-6 hover:bg-gray-50">
            <div className="text-lg font-semibold mb-2">Blank document</div>
            <p className="text-sm text-gray-600">Paste the application text from a web portal and start writing.</p>
          </Link>
          <Link href={`/project/${id}/materials`} className="rounded-lg border bg-white shadow-card p-6 hover:bg-gray-50">
            <div className="text-lg font-semibold mb-2">Start from an existing document</div>
            <p className="text-sm text-gray-600">Upload a .docx application to edit directly.</p>
          </Link>
        </div>
      </div>
    </PageShell>
  )
}
