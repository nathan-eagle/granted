'use client'

import { useMemo, useState } from 'react'
import { useToast } from '@/components/ui/Toast'

type Fact = { text: string; id?: string; kind?: string; evidence?: { uploadId?: string; quote?: string; filename?: string } }

export default function FactsList({ facts, sectionId }: { facts: Fact[]; sectionId: string }) {
  const [q, setQ] = useState('')
  const { show } = useToast()
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
          <li key={idx} style={{margin:'6px 0'}} title={(f.evidence?.filename ? f.evidence.filename + ': ' : '') + (f.evidence?.quote || '')}>
            <form action="/api/autopilot/append-fact" method="post" style={{display:'inline'}}>
              <input type="hidden" name="sectionId" value={sectionId} />
              <input type="hidden" name="text" value={f.text} />
              <button type="submit">Append</button>
            </form>
            {' '}
            <button onClick={async ()=>{
              const body:any = { sectionId, text: f.text }
              if (f.evidence?.uploadId) body.uploadId = f.evidence.uploadId
              await fetch('/api/autopilot/insert-citation', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) })
              show('Inserted with citation')
            }}>Insert with citation</button>
            {' '}{f.text}
          </li>
        ))}
      </ul>
    </div>
  )
}
