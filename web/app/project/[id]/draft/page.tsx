import PageShell from "../../../../components/layout/PageShell"
import DraftEditorClient from "./DraftEditorClient"

export default function DraftEditorPage({ params }: { params: { id: string } }) {
  return (
    <PageShell>
      <DraftEditorClient projectId={params.id} />
    </PageShell>
  )
}
