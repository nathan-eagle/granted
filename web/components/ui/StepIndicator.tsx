'use client'

export default function StepIndicator({ step, total }: { step: number; total: number }) {
  const pct = Math.round((step / total) * 100)
  return (
    <div style={{margin:'8px 0 16px'}}>
      <div style={{display:'flex', justifyContent:'space-between', fontSize:12, color:'#9CA3AF'}}>
        <span>Step {step} of {total}</span>
        <span>{pct}%</span>
      </div>
      <div style={{height:6, background:'#1F2937', borderRadius:999, overflow:'hidden'}}>
        <div style={{width:`${pct}%`, height:'100%', background:'linear-gradient(90deg,#7c3aed,#06b6d4)'}} />
      </div>
    </div>
  )
}

