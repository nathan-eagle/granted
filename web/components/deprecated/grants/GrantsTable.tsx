"use client"
import React from "react"

type Grant = {
  id: string
  name: string
  status: "Active" | "Draft" | "Submitted"
  due?: string
  requested?: string
  awarded?: string
  funder?: string
  programs?: string
  link?: string
}
const sample: Grant[] = [
  { id: "1", name: "NSF SBIR", status: "Active", due: "Pick a date", requested: "N/A", awarded: "N/A", funder: "Select", programs: "Select", link: "N/A" },
  { id: "2", name: "NIH R21", status: "Draft", due: "12/15/2025", requested: "$150,000", awarded: "—", funder: "NIH", programs: "R21", link: "portal.nih.gov" },
]

export default function GrantsTable() {
  const [q, setQ] = React.useState("")
  const [status, setStatus] = React.useState<""|"Active"|"Draft"|"Submitted">("")
  const [cols, setCols] = React.useState<Record<string, boolean>>({
    name: true, status: true, due: true, requested: true, awarded: true, funder: true, programs: true, link: true,
  })

  const rows = sample.filter(r => r.name.toLowerCase().includes(q.toLowerCase()) && (!status || r.status===status))

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search..." className="w-80 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]" />
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Status</label>
          <select value={status} onChange={e=>setStatus(e.target.value as any)} className="rounded-md border px-2 py-2 text-sm">
            <option value="">All</option>
            <option>Active</option>
            <option>Draft</option>
            <option>Submitted</option>
          </select>
        </div>
        <div className="ml-auto relative">
          <details className="group">
            <summary className="list-none cursor-pointer rounded-md border px-3 py-2 text-sm">Columns ▾</summary>
            <div className="absolute right-0 mt-2 w-48 bg-white border rounded-md shadow-card p-2">
              {Object.keys(cols).map(k => (
                <label key={k} className="flex items-center gap-2 text-sm px-2 py-1">
                  <input type="checkbox" checked={cols[k]} onChange={()=>setCols(s=>({...s, [k]: !s[k]}))} />
                  <span className="capitalize">{k}</span>
                </label>
              ))}
            </div>
          </details>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              {cols.name && <th className="text-left font-medium px-4 py-3">Name</th>}
              {cols.status && <th className="text-left font-medium px-4 py-3">Status</th>}
              {cols.due && <th className="text-left font-medium px-4 py-3">Due Date</th>}
              {cols.requested && <th className="text-left font-medium px-4 py-3">Amount Requested</th>}
              {cols.awarded && <th className="text-left font-medium px-4 py-3">Amount Awarded</th>}
              {cols.funder && <th className="text-left font-medium px-4 py-3">Funder</th>}
              {cols.programs && <th className="text-left font-medium px-4 py-3">Programs</th>}
              {cols.link && <th className="text-left font-medium px-4 py-3">Submission Links</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t">
                {cols.name && <td className="px-4 py-3">{r.name}</td>}
                {cols.status && <td className="px-4 py-3">{r.status}</td>}
                {cols.due && <td className="px-4 py-3 text-gray-500">{r.due || "—"}</td>}
                {cols.requested && <td className="px-4 py-3 text-gray-500">{r.requested || "—"}</td>}
                {cols.awarded && <td className="px-4 py-3 text-gray-500">{r.awarded || "—"}</td>}
                {cols.funder && <td className="px-4 py-3 text-gray-500">{r.funder || "—"}</td>}
                {cols.programs && <td className="px-4 py-3 text-gray-500">{r.programs || "—"}</td>}
                {cols.link && <td className="px-4 py-3 text-gray-500">{r.link || "—"}</td>}
              </tr>
            ))}
            {!rows.length && <tr><td className="px-4 py-6 text-gray-500" colSpan={8}>No results</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Pager stub */}
      <div className="flex items-center justify-end gap-3 text-sm text-gray-600 mt-3">
        <div>Rows per page</div>
        <select className="border rounded-md px-2 py-1"><option>10</option><option>50</option><option>100</option><option>1000</option></select>
        <div>Page 1 of 1</div>
        <button className="border rounded-md w-8 h-8">&lt;</button>
        <button className="border rounded-md w-8 h-8">&gt;</button>
      </div>
    </div>
  )
}
