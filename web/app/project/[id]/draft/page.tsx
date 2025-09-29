"use client"

import React from "react"
import { toast } from "sonner"
import ConfirmDialog from "../../../../components/ui/ConfirmDialog"
import PageShell from "../../../../components/layout/PageShell"
import RightRail from "../../../../components/right-rail/RightRail"
import RichEditor from "../../../../components/editor/RichEditor"

function ExampleCallout({ children }: { children: React.ReactNode }) {
  return <div className="border rounded-md bg-gray-50 p-3 text-sm text-gray-700">{children}</div>
}

export default function DraftEditor() {
  const [openDelete, setOpenDelete] = React.useState(false)

  return (
    <PageShell>
      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-5rem)]">
        {/* LEFT: outline / documents */}
        <aside className="col-span-3 rounded-lg border bg-white p-4 overflow-y-auto">
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Documents</h3>
            <ul className="space-y-1 text-sm">
              <li className="rounded-md px-2 py-1 bg-gray-100">Granted Overview.pdf</li>
              <li className="rounded-md px-2 py-1 hover:bg-gray-50">RFP</li>
              <li className="rounded-md px-2 py-1 hover:bg-gray-50">App</li>
            </ul>
            <div className="mt-3">
              <button className="text-xs rounded-md border px-2 py-1">+ Upload</button>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Outline</h3>
            <ul className="space-y-1 text-sm">
              <li className="rounded-md px-2 py-1 bg-gray-100">1. Specific Aims</li>
              <li className="rounded-md px-2 py-1 hover:bg-gray-50">2. Project Summary</li>
              <li className="rounded-md px-2 py-1 hover:bg-gray-50">3. Narrative</li>
            </ul>
          </div>

          <div className="mt-6">
            <a href="/projects" className="text-sm text-gray-600 underline">Back to Projects</a>
          </div>
        </aside>

        {/* CENTER: editor */}
        <section className="col-span-6 rounded-lg border bg-white overflow-y-auto">
          <div className="sticky top-0 z-10 border-b bg-white/85 backdrop-blur p-3 flex items-center justify-between">
            <div className="font-medium">NSF SBIR / Specific Aims</div>
            <div className="flex items-center gap-2">
              <button className="rounded-md border px-3 py-2 text-sm">Style ▾</button>
              <button className="rounded-md bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-sm px-3 py-2 hover:opacity-90">
                Write for me
              </button>
              <button
                onClick={() => toast.success("Export queued")}
                className="rounded-md border px-3 py-2 text-sm"
              >
                Export DOCX
              </button>
              <button
                onClick={() => toast("Autopilot running...", { description: "We'll notify you when done" })}
                className="rounded-md border px-3 py-2 text-sm"
              >
                Run Autopilot
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <h1 className="text-2xl font-semibold mb-2">Project Overview</h1>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[hsl(var(--primary))]" style={{ width: "100%" }} />
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-1">The Innovation</h2>
              <ExampleCallout>
                Leverage the unique capabilities of your technology to mitigate key risks and deliver a rapid, scalable solution.
              </ExampleCallout>
              <RichEditor content="<p></p>" />
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-1">Project Objectives</h2>
              <ExampleCallout>
                • Design primers and probes…\n• Validate diagnostic prototype analytically and clinically…
              </ExampleCallout>
              <RichEditor content="<p></p>" />
            </div>
          </div>

          <div className="px-6 pb-6">
            <button
              onClick={() => setOpenDelete(true)}
              className="rounded-md text-red-600 border border-red-200 px-3 py-2 text-sm"
            >
              Delete section
            </button>
          </div>

          <ConfirmDialog
            open={openDelete}
            onOpenChange={setOpenDelete}
            title="Delete section?"
            description="This will remove the current section."
            confirmText="Delete"
            onConfirm={() => toast.success("Section deleted")}
          />
        </section>

        {/* RIGHT: assistant */}
        <aside className="col-span-3 rounded-lg border bg-white p-4 overflow-y-auto">
          <RightRail />
        </aside>
      </div>
    </PageShell>
  )
}
