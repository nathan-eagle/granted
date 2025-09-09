'use client'

export default function SimpleEditorToolbar({ targetId }: { targetId: string }){
  function wrap(before: string, after: string){
    const el = document.getElementById(targetId) as HTMLTextAreaElement | null
    if (!el) return
    const start = el.selectionStart || 0
    const end = el.selectionEnd || 0
    const value = el.value
    const selected = value.slice(start, end)
    const next = value.slice(0, start) + before + selected + after + value.slice(end)
    el.value = next
    // reposition caret
    const pos = start + before.length + selected.length + after.length
    try { el.focus(); el.setSelectionRange(pos, pos) } catch {}
    // Trigger input event so React picks it up in controlled components (best-effort)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }
  return (
    <div style={{ display:'flex', gap:6, marginBottom:6 }}>
      <button type="button" onClick={()=> wrap('**','**')}><b>B</b></button>
      <button type="button" onClick={()=> wrap('*','*')}><i>I</i></button>
      <button type="button" onClick={()=> wrap('[','](url)')}>Link</button>
      <button type="button" onClick={()=> wrap('\n- ','')} title="Bullet">• List</button>
      <button type="button" onClick={()=> wrap('\n1. ','')} title="Numbered">1. List</button>
      <span style={{ fontSize:12, color:'#9CA3AF' }}>Basic toolbar</span>
    </div>
  )
}

