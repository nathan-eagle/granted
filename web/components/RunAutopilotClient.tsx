'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import PrimaryButton from '@/components/ui/PrimaryButton'
const MagicOverlay = dynamic(()=> import('@/components/MagicOverlay'), { ssr: false })

export default function RunAutopilotClient({ projectId, auto, mode: modeProp }: { projectId: string, auto?: boolean, mode?: string }){
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams()
  const modeFromUrl = search.get('mode') || undefined
  const mode = modeProp || modeFromUrl || 'rerun_smart'

  function removeRunParam(){
    try {
      const sp = new URLSearchParams(search.toString())
      sp.delete('run')
      router.replace(pathname + (sp.size ? `?${sp.toString()}` : ''), { scroll: false })
    } catch {}
  }

  async function kick(){
    setOpen(true)
  }
  useEffect(() => {
    if (auto && !open) {
      setOpen(true)
      removeRunParam()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto])
  return (
    <>
      <PrimaryButton onClick={() => { kick(); removeRunParam() }}>Run Autopilot</PrimaryButton>
      {open ? <MagicOverlay projectId={projectId} onClose={()=> { setOpen(false); removeRunParam(); router.refresh() }} mode={mode} /> : null}
    </>
  )
}
