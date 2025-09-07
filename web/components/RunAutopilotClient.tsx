'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import PrimaryButton from '@/components/ui/PrimaryButton'
const MagicOverlay = dynamic(()=> import('@/components/MagicOverlay'), { ssr: false })

export default function RunAutopilotClient({ projectId, auto }: { projectId: string, auto?: boolean }){
  const [open, setOpen] = useState(false)
  async function kick(){
    setOpen(true)
    await fetch('/api/autopilot/run', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ projectId }) })
  }
  if (auto && !open) { setTimeout(kick, 300) }
  return (
    <>
      <PrimaryButton onClick={kick}>Run Autopilot</PrimaryButton>
      {open ? <MagicOverlay projectId={projectId} onClose={()=> setOpen(false)} /> : null}
    </>
  )
}

