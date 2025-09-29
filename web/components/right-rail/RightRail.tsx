"use client"

import * as Tabs from "@radix-ui/react-tabs"
import CitationPopover from "../citations/CitationPopover"
import ChatBox from "./ChatBox"
import SourcesTab from "./SourcesTab"

type RightRailProps = {
  projectId: string
  onSourcesChange?: (ids: string[]) => void
}

export default function RightRail({ projectId, onSourcesChange }: RightRailProps) {
  return (
    <Tabs.Root defaultValue="assistant" className="flex flex-col h-full">
      <Tabs.List className="grid grid-cols-3 gap-2 mb-3">
        <Tabs.Trigger value="assistant" className="rounded-md border px-3 py-2 text-sm data-[state=active]:bg-gray-100">
          Assistant
        </Tabs.Trigger>
        <Tabs.Trigger value="citations" className="rounded-md border px-3 py-2 text-sm data-[state=active]:bg-gray-100">
          Citations
        </Tabs.Trigger>
        <Tabs.Trigger value="sources" className="rounded-md border px-3 py-2 text-sm data-[state=active]:bg-gray-100">
          Sources
        </Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="assistant" className="flex-1 overflow-auto space-y-4">
        <div>
          <div className="text-sm text-gray-600 mb-3">Suggested actions</div>
          <ul className="text-sm space-y-2">
            <li className="rounded-md border p-2 hover:bg-gray-50">Summarize this document</li>
            <li className="rounded-md border p-2 hover:bg-gray-50">Suggest sources for this section</li>
            <li className="rounded-md border p-2 hover:bg-gray-50">Create a list of action items</li>
          </ul>
        </div>
        <div>
          <div className="mb-2 text-sm text-gray-600">Add sources</div>
          <div className="rounded-md border p-2">
            <input className="w-full outline-none text-sm" placeholder="How can I help you with this document?" />
          </div>
        </div>
        <ChatBox />
      </Tabs.Content>

      <Tabs.Content value="citations" className="flex-1 overflow-auto space-y-4">
        <div>
          <div className="text-sm text-gray-600 mb-2">Inline references:</div>
          <div className="text-sm">
            Example sentence with <CitationPopover index={1} title="Speedup 2x in pilot" source="company.txt" /> and{" "}
            <CitationPopover index={2} title="Team with prior NSF award" source="company.txt" status="warn" /> for context.
          </div>
        </div>
        <div className="rounded-md border p-3 text-sm">
          <div className="font-medium mb-1">By section</div>
          <ul className="space-y-2">
            <li>Commercialization Plan — [1] [2]</li>
            <li>Team & Facilities — [1]</li>
            <li>Budget Justification — [1]</li>
          </ul>
        </div>
      </Tabs.Content>

      <Tabs.Content value="sources" className="flex-1 overflow-auto">
        <SourcesTab projectId={projectId} onChange={onSourcesChange} />
      </Tabs.Content>
    </Tabs.Root>
  )
}
