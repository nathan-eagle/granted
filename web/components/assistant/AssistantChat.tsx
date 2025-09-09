'use client'
import { useState } from 'react'

export default function AssistantChat({ projectId, initial, sections }: { projectId: string; initial?: { role: string; content: string }[]; sections?: { id:string; title:string }[] }){
  const [msgs, setMsgs] = useState<{ role: string; content: string }[]>(initial || [])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [target, setTarget] = useState<string>(sections?.[0]?.id || '')
  async function send(){
    const text = q.trim(); if (!text) return
    setBusy(true)
    setMsgs(m => [...m, { role:'user', content: text }])
    setQ('')
    try{
      const r = await fetch('/api/assistant/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ projectId, message: text }) })
      const j = await r.json()
      if (j.reply) setMsgs(m => [...m, { role:'assistant', content: j.reply }])
    } finally { setBusy(false) }
  }
  return (
    <div>
      <div style={{maxHeight:260, overflow:'auto', border:'1px solid #1f2430', borderRadius:8, padding:8, marginBottom:8}}>
        {msgs.map((m, i) => (
          <div key={i} style={{margin:'6px 0', color: m.role==='assistant' ? '#E5E7EB' : '#9CA3AF'}}>
            <strong>{m.role==='assistant' ? 'Assistant' : 'You'}:</strong> {m.content}
          </div>
        ))}
      </div>
      {sections?.length && msgs.filter(m=> m.role==='assistant').length ? (
        <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:8 }}>
          <select value={target} onChange={e=> setTarget(e.target.value)}>
            {sections!.map(s => (<option key={s.id} value={s.id}>{s.title}</option>))}
          </select>
          <button onClick={async ()=>{
            const last = [...msgs].reverse().find(m => m.role==='assistant')
            if (!last || !target) return
            setBusy(true)
            try{ await fetch('/api/autopilot/append-fact', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ sectionId: target, text: last.content }) }) } finally { setBusy(false) }
            try{ (window as any).location?.reload() }catch{}
          }} disabled={busy || !target}>Add last reply to section</button>
        </div>
      ) : null}
      <div style={{display:'flex', gap:6}}>
        <input value={q} onChange={e=> setQ(e.target.value)} onKeyDown={e=> { if (e.key==='Enter') send() }} placeholder="Ask a question or describe a change…" style={{flex:1}} />
        <button onClick={send} disabled={busy || !q.trim()}>Send</button>
      </div>
    </div>
  )
}
