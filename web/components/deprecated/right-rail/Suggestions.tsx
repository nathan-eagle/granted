"use client"

const suggestions = [
  "Summarize this section",
  "Suggest sources",
  "Create action items",
]

export default function Suggestions() {
  return (
    <div className="flex flex-col gap-2">
      {suggestions.map((text, i) => (
        <button
          key={i}
          className="text-sm text-left rounded-md border px-3 py-2 hover:bg-gray-50"
        >
          {text}
        </button>
      ))}
    </div>
  )
}
