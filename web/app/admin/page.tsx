import PageShell from "../../components/layout/PageShell"

export default async function AdminPage() {
  return (
    <PageShell>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-semibold mb-4">Admin / QA</h1>
        <p className="text-sm text-gray-600">Use API endpoints to run agent and score projects:</p>
        <ul className="list-disc list-inside text-sm mt-2">
          <li>POST /api/agent/run</li>
          <li>POST /api/eval/score {"{ projectId }"}</li>
          <li>POST /api/rfp/search {"{ keyword }"}</li>
          <li>POST /api/rfp/ingest {"{ pdfUrl, metadata }"}</li>
        </ul>
      </div>
    </PageShell>
  )
}
