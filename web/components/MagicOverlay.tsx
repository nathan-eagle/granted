'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import PrimaryButton from './ui/PrimaryButton'

const steps = [
  'Parsing your docs…',
  'Drafting sections…',
  'Checking coverage…',
  'Filling gaps…',
  'Tightening to limits…',
  'Getting reviewer feedback…',
  'Applying safe fixes…',
]

export default function MagicOverlay({ projectId, onClose }: { projectId: string; onClose: () => void }){
  const [active, setActive] = useState(true)
  const [doneSteps, setDoneSteps] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [files, setFiles] = useState<string[]>([])
  const router = useRouter()

  useEffect(() => {
    if (!projectId) return
    let closed = false
    const es = new EventSource(`/api/autopilot/stream?projectId=${projectId}`)
    es.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data)
        if (payload.type === 'status') {
          const label = String(payload.data?.label || '')
          if (label) setDoneSteps(prev => Array.from(new Set([...prev, label])))
        } else if (payload.type === 'files') {
          const names: string[] = Array.isArray(payload.data?.names) ? payload.data.names : []
          setFiles(names)
        } else if (payload.type === 'done') {
          setActive(false)
          es.close()
          try { router.refresh() } catch {}
          if (!closed) { closed = true; onClose() }
        } else if (payload.type === 'error') {
          setError(String(payload.data?.message || 'Error'))
        }
      } catch {}
    }
    es.onerror = () => {
      setError('Connection lost')
    }
    return () => { closed = true; es.close() }
  }, [projectId, onClose])

  if (!active) return null
  const doneCount = useMemo(() => {
    let count = 0
    for (const s of steps) {
      if (doneSteps.some(d => d.startsWith(s.replace('…','')))) count++
    }
    return count
  }, [doneSteps])

  // Failsafe: if we saw all steps, auto-close and refresh even if 'done' was missed
  useEffect(() => {
    if (doneCount >= steps.length && active) {
      try { router.refresh() } catch {}
      setActive(false)
      onClose()
    }
  }, [doneCount, active, onClose, router])

  return (
    <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000}}>
      <div style={{width:520, background:'#111318', border:'1px solid #1f2430', borderRadius:14, padding:20, color:'#E5E7EB', boxShadow:'0 12px 24px rgba(0,0,0,0.35)'}}>
        <div style={{fontWeight:700, fontSize:18, marginBottom:6}}>Autopilot is writing your draft…</div>
        <div style={{height:6, background:'#1F2937', borderRadius:999, overflow:'hidden', margin:'8px 0 12px'}}>
          <div style={{width:`${Math.min(100, Math.round((doneCount/steps.length)*100))}%`, height:'100%', background:'linear-gradient(90deg,#7c3aed,#06b6d4)'}} />
        </div>
        {error ? <div style={{color:'#fda4af', marginBottom:8}}>{error}</div> : null}
        {!!files.length && (
          <div style={{margin:'6px 0 8px', fontSize:12, color:'#9CA3AF'}}>
            Parsing {files.length} document{files.length>1?'s':''}: {files.slice(0,3).join(', ')}{files.length>3?` +${files.length-3} more`:''}
          </div>
        )}
        <ul style={{listStyle:'none', padding:0, margin:0}}>
          {steps.map((s,i)=> (
            <li key={s} style={{display:'flex', alignItems:'center', gap:8, opacity: i < doneCount ? 1 : 0.6, margin:'6px 0'}}>
              <span style={{width:16,height:16,borderRadius:999, background: i < doneCount ? '#10b981' : '#374151'}}/>
              <span>{s}</span>
            </li>
          ))}
        </ul>
        <div style={{textAlign:'right', marginTop:12}}>
          <PrimaryButton onClick={()=>{ setActive(false); try { router.refresh() } catch {}; onClose(); }}>Hide</PrimaryButton>
        </div>
      </div>
    </div>
  )
}
