'use client'
import { useEffect, useMemo, useState } from 'react'

type Section = { id: string; key: string; title: string; contentMd?: string }
type Fact = { id: string; text: string }

export default function Omnibox({ projectId, sections, facts }: { projectId: string; sections: Section[]; facts: Fact[] }){
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [target, setTarget] = useState(sections[0]?.id || '')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent){
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      } else if (e.key === 'Escape') { setOpen(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return [] as { type:'section'|'fact'; id:string; label:string; snippet:string }[]
    const out: { type:'section'|'fact'; id:string; label:string; snippet:string }[] = []
    for (const s of sections) {
      const text = String((s as any).contentMd || '')
      if (s.title.toLowerCase().includes(needle) || text.toLowerCase().includes(needle)) {
        const idx = text.toLowerCase().indexOf(needle)
        const snip = idx >= 0 ? text.slice(Math.max(0, idx-40), idx+needle.length+40) : s.title
        out.push({ type:'section', id: s.id, label: `${s.title}`, snippet: snip })
      }
    }
    for (const f of facts) {
      const t = String(f.text || '')
      if (t.toLowerCase().includes(needle)) {
        const idx = t.toLowerCase().indexOf(needle)
        const snip = idx >= 0 ? t.slice(Math.max(0, idx-40), idx+needle.length+40) : t
        out.push({ type:'fact', id: f.id, label: `Fact ${f.id}`, snippet: snip })
      }
    }
    return out.slice(0, 30)
  }, [q, sections, facts])

  async function insertFact(text: string){
    if (!target || !text) return
    setBusy(true)
    try{ await fetch('/api/autopilot/insert-citation', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ sectionId: target, text }) }) } finally { setBusy(false); setOpen(false) }
    try { (window as any).location?.reload() } catch {}
  }

  if (!open) return null
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:2000, display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:80 }}>
      <div style={{ width:820, maxWidth:'92vw', background:'#111318', color:'#E5E7EB', border:'1px solid #1f2430', borderRadius:12, overflow:'hidden' }}>
        <div style={{ padding:10, borderBottom:'1px solid #1f2430', display:'flex', gap:8, alignItems:'center' }}>
          <input autoFocus placeholder="Search sections and facts… (Cmd/Ctrl‑K to close)" value={q} onChange={e=> setQ(e.target.value)} style={{ flex:1, background:'#0b0d12', color:'#E5E7EB', border:'1px solid #1f2430', borderRadius:8, padding:'8px 10px' }} />
          <select value={target} onChange={e=> setTarget(e.target.value)} title="Insert target">
            {sections.map(s => (<option key={s.id} value={s.id}>{s.title}</option>))}
          </select>
        </div>
        <div style={{ maxHeight:420, overflow:'auto' }}>
          {!results.length ? (
            <div style={{ padding:12, color:'#9CA3AF' }}>Type to search…</div>
          ) : results.map((r, i) => (
            <div key={i} style={{ padding:10, borderBottom:'1px solid #1f2430', display:'grid', gridTemplateColumns:'1fr auto', gap:8 }}>
              <div>
                <div style={{ fontWeight:600 }}>{r.type==='section' ? 'Section' : 'Fact'} — {r.label}</div>
                <div style={{ fontSize:12, color:'#9CA3AF', whiteSpace:'pre-wrap' }}>{r.snippet}</div>
              </div>
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                <button onClick={()=> navigator.clipboard?.writeText(r.snippet)} disabled={busy}>Copy</button>
                {r.type==='fact' ? (
                  <button onClick={()=> insertFact(r.snippet)} disabled={busy || !target}>Insert with citation</button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

