'use client'
import { useToast } from '@/components/ui/Toast'

export default function ExportDocxButton({ projectId }: { projectId: string }){
  const { show } = useToast()
  function click(){
    show('Preparing DOCX…')
    const url = `/api/export/docx?projectId=${projectId}`
    try { window.open(url, '_blank') } catch {}
  }
  return <button type="button" onClick={click}>Export DOCX</button>
}

