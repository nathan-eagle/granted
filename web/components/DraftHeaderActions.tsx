'use client'
import PrimaryButton from '@/components/ui/PrimaryButton'
import ExportDocxButton from '@/components/ExportDocxButton'
import RunAutopilotClient from '@/components/RunAutopilotClient'

export default function DraftHeaderActions({ projectId, auto, mode }: { projectId: string; auto?: boolean; mode?: string }){
  function fullRegen(){
    const ok = confirm('Full regenerate will replace sections. Proceed?')
    if (ok) {
      try { window.location.href = '?run=1&mode=first_run' } catch {}
    }
  }
  return (
    <div style={{display:'flex', gap:8, alignItems:'center'}}>
      <RunAutopilotClient projectId={projectId} auto={auto} mode={mode} />
      <ExportDocxButton projectId={projectId} />
      <button type="button" onClick={fullRegen} style={{background:'#fee2e2', border:'1px solid #ef4444', color:'#991b1b', borderRadius:8, padding:'6px 10px'}}>Full Regenerate</button>
    </div>
  )
}

