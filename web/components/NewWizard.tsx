'use client'
import { useState } from 'react'
import StepIndicator from '@/components/ui/StepIndicator'
import PrimaryButton from '@/components/ui/PrimaryButton'

type Pack = { id: string; file: string; label: string }

export default function NewWizard({ packs }: { packs: Pack[] }){
  const [step, setStep] = useState(1)
  const [pack, setPack] = useState(packs[0]?.file || '')
  const [useRfp, setUseRfp] = useState(false)
  const [rfpUrl, setRfpUrl] = useState('')
  const [rfpFile, setRfpFile] = useState<File | null>(null)
  const [answers, setAnswers] = useState<Record<string,string>>({})
  const [uploads, setUploads] = useState<File[]>([])
  const total = 3

  function next(){ setStep(s => Math.min(total, s+1)) }
  function back(){ setStep(s => Math.max(1, s-1)) }

  async function runAutopilot(){
    // 1) Create project via API
    const fd = new FormData()
    fd.append('pack', useRfp ? (packs[0]?.file || pack) : pack)
    Object.entries(answers).forEach(([k,v])=> fd.append(k, v))
    const res = await fetch('/api/projects/create', { method:'POST', body: fd })
    const { projectId } = await res.json()
    // 1b) If RFP URL/file provided, attach and generate auto-pack
    if (useRfp) {
      if (rfpFile) {
        const uf = new FormData(); uf.append('projectId', projectId); uf.append('kind','rfp'); uf.append('file', rfpFile)
        await fetch('/api/autopilot/upload', { method:'POST', body: uf })
        await fetch('/api/autopilot/generate-pack', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ projectId, source:'upload' }) })
      } else if (rfpUrl) {
        await fetch('/api/autopilot/generate-pack', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ projectId, url: rfpUrl }) })
      }
    }
    // 2) Upload files
    for (const file of uploads){
      const uf = new FormData(); uf.append('projectId', projectId); uf.append('kind','upload'); uf.append('file', file)
      await fetch('/api/autopilot/upload', { method:'POST', body: uf })
    }
    // 3) Redirect to draft (server will trigger Autodraft in our current flow)
    window.location.href = `/project/${projectId}/draft?run=1`
  }

  return (
    <div>
      <StepIndicator step={step} total={total} />
      {step===1 && (
        <div>
          <h2>Program or RFP</h2>
          <div style={{display:'flex', gap:12, marginTop:8}}>
            <button onClick={()=> setUseRfp(false)} style={{padding:'8px 12px', borderRadius:8, border:'1px solid #1f2430', background: !useRfp ? '#151925' : '#111318', color:'#E5E7EB'}}>Choose Pack</button>
            <button onClick={()=> setUseRfp(true)} style={{padding:'8px 12px', borderRadius:8, border:'1px solid #1f2430', background: useRfp ? '#151925' : '#111318', color:'#E5E7EB'}}>I have an RFP</button>
          </div>
          {!useRfp ? (
            <div style={{display:'grid', gap:12, gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', marginTop:8}}>
              {packs.map(p => (
                <button key={p.file} onClick={()=> setPack(p.file)} style={{border:'1px solid #1f2430', borderRadius:12, padding:12, textAlign:'left', background: pack===p.file ? '#151925' : '#111318', color:'#E5E7EB'}}>
                  <div style={{fontWeight:700}}>{p.label}</div>
                  <div style={{fontSize:12, color:'#9CA3AF'}}>Phase I Autodraft</div>
                </button>
              ))}
            </div>
          ) : (
            <div style={{display:'grid', gap:8, marginTop:8}}>
              <input placeholder="Paste RFP URL (optional)" value={rfpUrl} onChange={e => setRfpUrl(e.target.value)} />
              <div style={{fontSize:12, color:'#9CA3AF'}}>Or upload the RFP PDF/DOCX:</div>
              <input type="file" accept=".pdf,.docx" onChange={e => setRfpFile((e.target.files && e.target.files[0]) || null)} />
            </div>
          )}
        </div>
      )}
      {step===2 && (
        <div style={{display:'grid', gap:8}}>
          {['problem','innovation','customer','evidence','milestones','risks'].map(key => (
            <input key={key} placeholder={key} value={answers[key] || ''} onChange={e => setAnswers(a => ({...a, [key]: e.target.value}))} />
          ))}
          <div style={{fontSize:12, color:'#9CA3AF'}}>Skip if you prefer—we’ll make safe assumptions.</div>
        </div>
      )}
      {step===3 && (
        <div>
          <div>Optional uploads: .pdf / .docx / .txt / .md</div>
          <input type="file" multiple accept=".pdf,.docx,.txt,.md"
            onChange={e => setUploads(Array.from(e.target.files || []))} />
          <div style={{fontSize:12, color:'#9CA3AF', marginTop:6}}>
            {uploads.length} file(s) selected
          </div>
        </div>
      )}
      <div style={{display:'flex', justifyContent:'space-between', marginTop:12}}>
        <button onClick={back} disabled={step===1}>Back</button>
        {step<total ? (
          <PrimaryButton onClick={next}>Next</PrimaryButton>
        ) : (
          <PrimaryButton onClick={runAutopilot}>Run Autopilot</PrimaryButton>
        )}
      </div>
    </div>
  )
}
