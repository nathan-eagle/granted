"use client"

import { useState } from "react"

import type { CoverageV1 } from "@/lib/contracts"

export function ConversationPanel({ projectName, coverage }: { projectName: string; coverage: CoverageV1 | null }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: `Let's work on ${projectName}. Paste an RFP link or upload a PDF to begin.` },
  ])
  const [draft, setDraft] = useState("")

  const handleSend = () => {
    if (!draft.trim()) return
    setMessages(msgs => [
      ...msgs,
      { role: "user", content: draft.trim() },
      { role: "assistant", content: "Thanks! I have queued this input." },
    ])
    setDraft("")
  }

  const quickReplies = ["Upload RFP", "Add org website", "Draft now"]

  return (
    <div className="flex h-full flex-col rounded-lg border bg-white">
      <header className="border-b px-4 py-3 text-sm font-semibold">Chat</header>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
        {messages.map((message, index) => (
          <div key={index} className={message.role === "user" ? "text-right" : "text-left"}>
            <div
              className={`inline-block rounded-md px-3 py-2 ${
                message.role === "user" ? "bg-[hsl(var(--primary))] text-white" : "bg-gray-100"
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        {coverage && (
          <div className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-500">
            Current coverage score: {(coverage.score * 100).toFixed(0)}%
          </div>
        )}
      </div>
      <footer className="border-t p-3">
        <div className="mb-2 flex flex-wrap gap-2">
          {quickReplies.map(reply => (
            <button
              key={reply}
              className="rounded-full border px-3 py-1 text-xs text-gray-600 hover:bg-gray-100"
              onClick={() => setDraft(reply)}
            >
              {reply}
            </button>
          ))}
        </div>
        <textarea
          value={draft}
          onChange={event => setDraft(event.target.value)}
          placeholder="Send a message or describe the next step"
          className="h-20 w-full resize-none rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={handleSend}
            className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Send
          </button>
        </div>
      </footer>
    </div>
  )
}
