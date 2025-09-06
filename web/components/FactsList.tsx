'use client'

import { useMemo, useState } from 'react'

type Fact = { text: string; id?: string; kind?: string; evidence?: { uploadId?: string; quote?: string; filename?: string } }

export default function FactsList({ facts, sectionId }: { facts: Fact[]; sectionId: string }) {
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    if (!q) return facts.slice(0, 20)
    const lower = q.toLowerCase()
    return facts.filter(f => (f.text || '').toLowerCase().includes(lower)).slice(0, 20)
  }, [facts, q])

  return (
    <div>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search facts" style={{width:'100%', margin:'6px 0'}} />
      <ul>
        {list.map((f, idx) => (
          <li key={idx} style={{margin:'4px 0'}} title={(f.evidence?.filename ? f.evidence.filename + ': ' : '') + (f.evidence?.quote || '')}>
            <form action="/api/autopilot/append-fact" method="post">
              <input type="hidden" name="sectionId" value={sectionId} />
              <input type="hidden" name="text" value={f.text} />
              <button type="submit">Append</button> {f.text}
            </form>
          </li>
        ))}
      </ul>
    </div>
  )
}
