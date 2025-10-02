import Link from "next/link"
import PageShell from "../../components/layout/PageShell"

export const dynamic = "force-dynamic"

export default function AdminPage() {
  return (
    <PageShell>
      <div className="mx-auto flex max-w-4xl flex-col gap-6 py-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Admin / QA</h1>
          <p className="text-sm text-muted-foreground">
            One-off tools to exercise the orchestration pipeline and inspect API endpoints.
          </p>
        </header>

        <section className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium">Run full orchestrator</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Kicks off search → ingest → attachments → blueprint → map → autopilot → export → score and stores artifacts.
          </p>
          <form action="/api/agent/full-run" method="post" className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              Keyword
              <input
                name="keyword"
                defaultValue="NSF SBIR"
                className="mt-1 w-full rounded border px-2 py-1"
              />
            </label>
            <label className="text-sm">
              Project name
              <input
                name="projectName"
                defaultValue="NSF SBIR Demo"
                className="mt-1 w-full rounded border px-2 py-1"
              />
            </label>
            <label className="text-sm">
              Simpler opportunity ID
              <input
                name="simplerId"
                placeholder="optional"
                className="mt-1 w-full rounded border px-2 py-1"
              />
            </label>
            <label className="text-sm">
              Grants.gov opportunity number
              <input
                name="opportunityId"
                placeholder="optional"
                className="mt-1 w-full rounded border px-2 py-1"
              />
            </label>
            <label className="text-sm md:col-span-2">
              Blueprint ID
              <input
                name="blueprintId"
                defaultValue="nsf_sbir"
                className="mt-1 w-full rounded border px-2 py-1"
              />
            </label>
            <button
              type="submit"
              className="md:col-span-2 inline-flex w-fit items-center rounded bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))]"
            >
              Run full pipeline
            </button>
          </form>
        </section>

        <section className="space-y-2 text-sm text-muted-foreground">
          <h2 className="text-base font-medium text-foreground">Quick reference</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>POST `/api/agent/run` — headless single-section demo run</li>
            <li>POST `/api/agent/full-run` — orchestration endpoint triggered above</li>
            <li>
              POST `/api/eval/score` with `{'{'} projectId {'}'}` — generate scorecard JSON
            </li>
            <li>
              POST `/api/rfp/search` with `{'{'} keyword {'}'}` — Grants.gov search proxy
            </li>
            <li>
              POST `/api/rfp/ingest` with `{'{'} metadata, pdfUrl {'}'}` — ingest solicitation PDF
            </li>
          </ul>
          <p>
            Need a login shortcut? <Link className="text-[hsl(var(--primary))] underline" href="/dev/login">Use the dev login helper</Link> (if enabled).
          </p>
        </section>
      </div>
    </PageShell>
  )
}
