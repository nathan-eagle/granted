"use client"
import React from "react"

export default function SourcesTab({ projectId, onChange }: { projectId: string; onChange?: (ids: string[])=>void }) {
  const [items, setItems] = React.useState<any[]>([])
  const [selected, setSelected] = React.useState<string[]>([])

  const refresh = React.useCallback(async () => {
    const res = await fetch(`/api/uploads?projectId=${projectId}&kind=source`)
    const json = await res.json()
    setItems(json.uploads || [])
  }, [projectId])
  React.useEffect(() => { refresh() }, [refresh])

  function toggle(id: string) {
    setSelected(prev => {
      const next = prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]
      onChange?.(next)
      return next
    })
  }

  const totalWords = items.filter(i => selected.includes(i.id)).reduce((sum, i)=> sum + (i.text ? i.text.split(/\s+/).length : 0), 0)

  return (
    <div>
      <div className="text-sm text-gray-600 mb-2">Select source materials</div>
      <ul className="space-y-1">
        {items.map((i: any) => (
          <li key={i.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={selected.includes(i.id)} onChange={()=>toggle(i.id)} />
            <span>{i.filename}</span>
            <span className="text-gray-500">({i.text ? i.text.split(/\s+/).length : 0} words)</span>
          </li>
        ))}
        {!items.length && <li className="text-sm text-gray-500">No sources uploaded yet</li>}
      </ul>
      <div className="mt-3 text-xs text-gray-600">Selected word count: {totalWords.toLocaleString()}</div>
    </div>
  )
}
