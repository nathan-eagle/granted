'use client'
import { useEffect, useState } from 'react'
import PrimaryButton from './ui/PrimaryButton'

const steps = [
  'Parsing your docs',
  'Drafting sections',
  'Checking coverage',
  'Filling gaps',
  'Tightening to limits',
  'Getting reviewer feedback',
  'Applying safe fixes',
]

export default function MagicOverlay({ projectId, onClose }: { projectId: string; onClose: () => void }){
  const [active, setActive] = useState(true)
  const [progress, setProgress] = useState<string[]>([])

  useEffect(() => {
    let alive = true
    async function poll(){
      try{
        const res = await fetch(`/api/autopilot/progress?projectId=${projectId}`, { cache: 'no-store' })
        const data = await res.json()
        if (!alive) return
        setProgress(Array.isArray(data.progress)? data.progress: [])
        if (data.done) { setActive(false); onClose(); }
        else setTimeout(poll, 1000)
      } catch { setTimeout(poll, 1500) }
    }
    poll();
    return () => { alive = false }
  }, [projectId, onClose])

  if (!active) return null
  const idx = steps.findIndex(s => progress.includes(s))
  const doneCount = progress.length

  return (
    <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000}}>
      <div style={{width:520, background:'#111318', border:'1px solid #1f2430', borderRadius:14, padding:20, color:'#E5E7EB', boxShadow:'0 12px 24px rgba(0,0,0,0.35)'}}>
        <div style={{fontWeight:700, fontSize:18, marginBottom:6}}>Autopilot is writing your draft…</div>
        <div style={{height:6, background:'#1F2937', borderRadius:999, overflow:'hidden', margin:'8px 0 12px'}}>
          <div style={{width:`${Math.min(100, Math.round((doneCount/steps.length)*100))}%`, height:'100%', background:'linear-gradient(90deg,#7c3aed,#06b6d4)'}} />
        </div>
        <ul style={{listStyle:'none', padding:0, margin:0}}>
          {steps.map((s,i)=> (
            <li key={s} style={{display:'flex', alignItems:'center', gap:8, opacity: i < doneCount ? 1 : 0.6, margin:'6px 0'}}>
              <span style={{width:16,height:16,borderRadius:999, background: i < doneCount ? '#10b981' : '#374151'}}/>
              <span>{s}</span>
            </li>
          ))}
        </ul>
        <div style={{textAlign:'right', marginTop:12}}>
          <PrimaryButton onClick={()=>{ setActive(false); onClose(); }}>Hide</PrimaryButton>
        </div>
      </div>
    </div>
  )
}

