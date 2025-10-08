import type { Section } from "@prisma/client"

import { simulateCompliance } from "@/lib/compliance/simulator"

export function CompliancePanel({ sections }: { sections: Pick<Section, "key" | "title" | "contentMd" | "formatLimits">[] }) {
  return (
    <div className="rounded-md border bg-white">
      <header className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Compliance simulator</h3>
        <p className="text-xs text-gray-500">Estimates based on current tighten settings.</p>
      </header>
      <ul className="divide-y text-sm">
        {sections.map(section => {
          const limits = (section.formatLimits as any) || {}
          const compliance = simulateCompliance(section.contentMd ?? "", limits)
          return (
            <li key={section.key} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">{section.title}</span>
                <span className={`text-xs ${compliance.status === "ok" ? "text-green-600" : "text-red-600"}`}>
                  {compliance.status === "ok" ? "Within limits" : "Overflow"}
                </span>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {Math.round(compliance.wordCount)} words · {compliance.estimatedPages.toFixed(2)} pages
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
