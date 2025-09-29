"use client"
import * as Popover from "@radix-ui/react-popover"

export default function CitationPopover({ index, title, source, status="ok" }: { index: number; title: string; source: string; status?: "ok"|"warn"|"bad" }) {
  const dot = status === "ok" ? "bg-green-500" : status === "warn" ? "bg-yellow-500" : "bg-red-500"
  return (
    <Popover.Root>
      <Popover.Trigger className="align-baseline text-[13px] underline decoration-dotted text-gray-700">[{index}]</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content side="top" className="rounded-md border bg-white shadow-card p-3 w-64 text-sm">
          <div className="flex items-center justify-between">
            <div className="font-medium">{title}</div>
            <span className={"h-2 w-2 rounded-full " + dot}></span>
          </div>
          <div className="text-gray-600 mt-1">{source}</div>
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
