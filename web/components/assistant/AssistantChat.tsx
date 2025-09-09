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
    <div style={{border:'1px solid #1f2430', borderRadius:12, overflow:'hidden'}}>
      <div style={{maxHeight:260, overflow:'auto', padding:8, background:'#0b0d12'}}>
        {msgs.map((m, i) => (
          <div key={i} style={{margin:'8px 0', color: m.role==='assistant' ? '#E5E7EB' : '#9CA3AF'}}>
            <div style={{fontSize:12, color:'#9CA3AF'}}>{m.role==='assistant' ? 'Assistant' : 'You'}</div>
            <div style={{whiteSpace:'pre-wrap'}}>{m.content}</div>
            {m.role==='assistant' && sections?.length ? (
              <div style={{display:'flex', gap:6, alignItems:'center', marginTop:6}}>
                <select value={target} onChange={e=> setTarget(e.target.value)}>
                  {sections!.map(s => (<option key={s.id} value={s.id}>{s.title}</option>))}
                </select>
                <button onClick={async ()=>{
                  if (!target) return
                  setBusy(true)
                  try{ await fetch('/api/autopilot/append-fact', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ sectionId: target, text: m.content }) }) } finally { setBusy(false) }
                  try{ (window as any).location?.reload() }catch{}
                }} disabled={busy || !target}>Add to grant</button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <div style={{display:'flex', gap:6, padding:8, background:'#111318', borderTop:'1px solid #1f2430'}}>
        <input value={q} onChange={e=> setQ(e.target.value)} onKeyDown={e=> { if (e.key==='Enter') send() }} placeholder="Ask a question or describe a change…" style={{flex:1, background:'#0b0d12', color:'#E5E7EB', border:'1px solid #1f2430', borderRadius:8, padding:'8px 10px'}} />
        <button onClick={send} disabled={busy || !q.trim()}>Send</button>
      </div>
    </div>
  )
}
