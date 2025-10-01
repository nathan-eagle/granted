import fs from "node:fs"
import { parse } from "csv-parse/sync"

const input = process.argv[2]
if (!input) {
  console.error("Usage: node scripts/import_prompts_from_csv.mjs prompts.csv > web/lib/blueprints/nsf_sbir.ts")
  process.exit(1)
}
const csv = fs.readFileSync(input, "utf8")
const rows = parse(csv, { columns: true, skip_empty_lines: true })

function esc(str) { return String(str || "").replace(/`/g, "\`") }

const sections = rows.map((r, idx) => ({
  key: String(r.key || `s${idx+1}`),
  title: String(r.title || `Section ${idx+1}`),
  targetWords: r.targetWords ? Number(r.targetWords) : undefined,
  promptTemplate: String(r.promptTemplate || ""),
}))

const file = `export type BlueprintSection = { key: string; title: string; targetWords?: number; promptTemplate: string }
export type Blueprint = { slug: string; label: string; sections: BlueprintSection[]; variables: { key: string; label: string; hint?: string }[] }
export const NSF_SBIR_PHASE_I: Blueprint = {
  slug: "nsf-sbir-phase-i",
  label: "NSF SBIR Phase I",
  variables: [
    { key: "org_mission", label: "Organization mission", hint: "1-2 sentences" },
    { key: "product_name", label: "Product/innovation name" },
    { key: "target_customer", label: "Primary customer/beneficiary" },
    { key: "problem", label: "Problem statement (why now?)" },
    { key: "innovation_summary", label: "What is novel?" },
    { key: "evidence", label: "Evidence/prior results (pilots, publications)" },
  ],
  sections: [
` + sections.map(s => `    { key: "${esc(s.key)}", title: "${esc(s.title)}", ${s.targetWords ? `targetWords: ${s.targetWords}, ` : ""}promptTemplate: \\`${esc(s.promptTemplate)}\\` },`).join("\n") + `
  ]
}
`

process.stdout.write(file)
