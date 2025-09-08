"use client"
import { useState } from 'react'
import PrimaryButton from './ui/PrimaryButton'

export default function TopFixes({ projectId, fixes }: { projectId: string; fixes: any[] }){
  const [items, setItems] = useState<any[]>(Array.isArray(fixes) ? fixes.slice(0, 5) : [])
  async function apply(sectionKey: string, patch: string){
    const fd = new FormData(); fd.append('sectionKey', sectionKey); fd.append('patch', patch)
    await fetch(`/project/${projectId}/draft`, { method: 'POST', body: fd })
    try { await fetch(`/api/autopilot/coverage`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ projectId }) }) } catch {}
    // Optimistically remove item
    setItems(prev => prev.filter(it => String(it.sectionKey||'') !== sectionKey || String(it.patch||'') !== patch))
  }
  async function applyAll(){
    await fetch(`/project/${projectId}/draft`, { method: 'POST', body: new FormData() })
    try { await fetch(`/api/autopilot/coverage`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ projectId }) }) } catch {}
    setItems([])
  }
  if (!items.length) return null
  return (
    <div style={{border:'1px solid #1f2430', borderRadius:12, padding:12, margin:'8px 0'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div style={{fontWeight:700}}>Top Fixes</div>
        <PrimaryButton onClick={applyAll}>Apply all safe fixes</PrimaryButton>
      </div>
      <ul style={{margin:8, paddingLeft:18}}>
        {items.map((f:any, idx:number)=> (
          <li key={idx} style={{margin:'6px 0'}}>
            <button onClick={()=> apply(String(f.sectionKey||''), String(f.patch||''))} disabled={!f.patch}>Add to my grant</button>
            {' '}<a href={`#sec-${String(f.sectionKey||'')}`} style={{textDecoration:'none'}} title="Open section">Open</a>
            {' '}<strong>{String(f.sectionKey||'')}</strong>: {String(f.label||'')}
          </li>
        ))}
      </ul>
    </div>
  )
}
