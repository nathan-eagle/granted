"use client"
import React from "react"

export default function ChatBox() {
  const [input, setInput] = React.useState("How should I structure the Specific Aims?")
  const [log, setLog] = React.useState<{ role: "user" | "assistant"; content: string }[]>([])
  const [busy, setBusy] = React.useState(false)

  async function send() {
    if (!input.trim()) return
    const messages = [
      ...log.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: input },
    ]
    setBusy(true)
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    })
    const json = await res.json()
    setBusy(false)
    setLog((prev) => [
      ...prev,
      { role: "user", content: input },
      { role: "assistant", content: json.output || "" },
    ])
    setInput("")
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto rounded-md border p-2 text-sm space-y-2 bg-gray-50">
        {log.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : ""}>
            <div
              className={
                "inline-block px-3 py-2 rounded-md " +
                (m.role === "user"
                  ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                  : "bg-white border")
              }
            >
              {m.content}
            </div>
          </div>
        ))}
        {!log.length && (
          <div className="text-sm text-gray-500">Ask anything about this grant workspace.</div>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the assistant..."
          className="flex-1 rounded-md border px-3 py-2 text-sm"
        />
        <button
          onClick={send}
          disabled={busy}
          className="rounded-md bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] px-3 py-2 text-sm disabled:opacity-60"
        >
          {busy ? "…" : "Send"}
        </button>
      </div>
    </div>
  )
}
