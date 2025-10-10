'use client'
import { useState } from 'react'
import { useToast } from '@/components/ui/Toast'

export default function CharterIntake({ projectId, initial }: { projectId: string; initial?: any }){
  const [form, setForm] = useState<any>({
    problem: initial?.problem || '',
    innovation: initial?.innovation || '',
    customer: initial?.customer || '',
    evidence: initial?.evidence || '',
    milestones: initial?.milestones || '',
    risks: initial?.risks || '',
  })
  const { show } = useToast()
  async function save(){
    await fetch('/api/projects/save-charter', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ projectId, charter: form }) })
    show('Saved answers')
  }
  return (
    <div style={{border:'1px solid #1f2430', borderRadius:12, padding:10}}>
      <div style={{fontWeight:600, marginBottom:6}}>Quick Intake</div>
      {Object.keys(form).map((k) => (
        <div key={k} style={{marginBottom:6}}>
          <div style={{fontSize:12, color:'#9CA3AF'}}>{k}</div>
          <input value={form[k]} onChange={e=> setForm((f:any) => ({...f, [k]: e.target.value}))} style={{width:'100%'}} />
        </div>
      ))}
      <button onClick={save}>Save</button>
    </div>
  )
}

