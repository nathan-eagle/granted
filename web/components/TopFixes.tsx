'use client'
import PrimaryButton from './ui/PrimaryButton'

export default function TopFixes({ projectId, fixes }: { projectId: string; fixes: any[] }){
  async function apply(sectionKey: string, patch: string){
    const fd = new FormData(); fd.append('sectionKey', sectionKey); fd.append('patch', patch)
    await fetch(`/project/${projectId}/draft`, { method: 'POST', body: fd })
    location.reload()
  }
  async function applyAll(){
    await fetch(`/project/${projectId}/draft`, { method: 'POST', body: new FormData() })
    location.reload()
  }
  const list = (fixes || []).slice(0,5)
  if (!list.length) return null
  return (
    <div style={{border:'1px solid #1f2430', borderRadius:12, padding:12, margin:'8px 0'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div style={{fontWeight:700}}>Top Fixes</div>
        <PrimaryButton onClick={applyAll}>Apply all safe fixes</PrimaryButton>
      </div>
      <ul style={{margin:8, paddingLeft:18}}>
        {list.map((f:any, idx:number)=> (
          <li key={idx} style={{margin:'6px 0'}}>
            <button onClick={()=> apply(String(f.sectionKey||''), String(f.patch||''))} disabled={!f.patch}>Apply</button>
            {' '}<strong>{String(f.sectionKey||'')}</strong>: {String(f.label||'')}
          </li>
        ))}
      </ul>
    </div>
  )
}

