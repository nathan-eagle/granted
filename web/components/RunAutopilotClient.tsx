'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import PrimaryButton from '@/components/ui/PrimaryButton'
const MagicOverlay = dynamic(()=> import('@/components/MagicOverlay'), { ssr: false })

export default function RunAutopilotClient({ projectId, auto }: { projectId: string, auto?: boolean }){
  const [open, setOpen] = useState(false)
  const router = useRouter()
  async function kick(){
    setOpen(true)
  }
  if (auto && !open) { setTimeout(kick, 300) }
  return (
    <>
      <PrimaryButton onClick={kick}>Run Autopilot</PrimaryButton>
      {open ? <MagicOverlay projectId={projectId} onClose={()=> { setOpen(false); router.refresh() }} /> : null}
    </>
  )
}
