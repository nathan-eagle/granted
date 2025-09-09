'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'

export default function ActionButtons({ sectionId, projectId }: { sectionId: string; projectId: string }){
  const [busy, setBusy] = useState<string>('')
  const { show } = useToast()
  const router = useRouter()
  async function call(path: string, body: any, label: string){
    try{
      setBusy(label)
      show(label + '…')
      await fetch(path, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) })
      await fetch('/api/autopilot/coverage', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ projectId }) })
      show('Done: ' + label)
      router.refresh()
    } finally { setBusy('') }
  }
  return (
    <div style={{display:'flex',gap:8}}>
      <button onClick={()=> call('/api/autopilot/fill-gap', { sectionId }, 'Fix next')} disabled={!!busy}>{busy==='Fix next' ? 'Working…' : 'Fix next'}</button>
      <button onClick={()=> call('/api/autopilot/tighten', { sectionId }, 'Tighten')} disabled={!!busy}>{busy==='Tighten' ? 'Working…' : 'Tighten to limit'}</button>
      <button onClick={()=> call('/api/autopilot/regenerate-section', { projectId, sectionId }, 'Regenerate section')} disabled={!!busy}>{busy==='Regenerate section' ? 'Working…' : 'Regenerate section'}</button>
    </div>
  )
}

