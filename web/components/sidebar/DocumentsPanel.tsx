'use client'
import { useCallback, useMemo, useRef, useState } from 'react'

type Upload = { id: string; filename: string; kind: string }

export default function DocumentsPanel({ projectId, uploads }: { projectId: string; uploads: Upload[] }){
  const [dragOver, setDragOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const byKind = useMemo(() => {
    const g: Record<string, Upload[]> = {}
    for (const u of uploads) {
      const k = u.kind || 'other'
      g[k] = g[k] || []
      g[k].push(u)
    }
    return g
  }, [uploads])

  const doUpload = useCallback(async (files: FileList | File[]) => {
    if (!files || (files as any).length === 0) return
    setBusy(true)
    setMessage('Uploading…')
    try{
      const fd = new FormData()
      fd.append('projectId', projectId)
      Array.from(files as unknown as File[]).forEach((f: File) => fd.append('file', f))
      const res = await fetch('/api/autopilot/upload', { method:'POST', body: fd })
      if (!res.ok) throw new Error('Upload failed')
      setMessage('Uploaded')
      setTimeout(()=> setMessage(''), 1200)
      // best-effort refresh
      try { (window as any).location?.reload() } catch {}
    } catch(e:any){ setMessage(e?.message || 'Error') }
    finally { setBusy(false) }
  }, [projectId])

  return (
    <div>
      <div style={{fontWeight:600, marginBottom:6}}>Documents</div>
      {Object.keys(byKind).length ? (
        <div style={{fontSize:12, color:'#6b7280', marginBottom:8}}>
          {Object.entries(byKind).map(([k, arr]) => (
            <div key={k} style={{marginBottom:4}}>
              <div style={{fontWeight:600, color:'#374151'}}><span style={{display:'inline-block', padding:'2px 6px', border:'1px solid #1f2430', borderRadius:999, marginRight:6}}>{k}</span> ({arr.length})</div>
              <ul style={{margin:0, paddingLeft:16}}>
                {arr.map(u => (
                  <RowUpload key={u.id} u={u} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : <div style={{color:'#6b7280', fontSize:12}}>No documents uploaded</div>}

      <div
        onDragOver={(e)=>{ e.preventDefault(); setDragOver(true) }}
        onDragLeave={()=> setDragOver(false)}
        onDrop={(e)=>{ e.preventDefault(); setDragOver(false); if (e.dataTransfer?.files?.length) doUpload(e.dataTransfer.files) }}
        style={{marginTop:8, padding:'10px 12px', border:'1px dashed #9CA3AF', borderRadius:10, background: dragOver ? '#111318' : 'transparent'}}
      >
        <div style={{fontSize:12, color:'#9CA3AF'}}>Drag & drop .pdf/.docx/.txt/.md here</div>
        <div style={{marginTop:6}}>
          <button onClick={()=> inputRef.current?.click()} disabled={busy}>{busy? 'Uploading…' : 'Choose files'}</button>
          <input ref={inputRef} type="file" multiple accept=".pdf,.docx,.txt,.md" style={{display:'none'}} onChange={e => doUpload(e.target.files || [])} />
        </div>
        {message ? <div style={{fontSize:12, color:'#9CA3AF', marginTop:6}}>{message}</div> : null}
      </div>
      <div style={{marginTop:8}}>
        <button onClick={async ()=>{ setBusy(true); setMessage('Mining facts…'); try{ await fetch('/api/autopilot/mine-facts', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ projectId }) }); setMessage('Facts updated'); setTimeout(()=> setMessage(''), 1200) } finally { setBusy(false) } }}>Re‑mine facts</button>
      </div>
    </div>
  )
}

function RowUpload({ u }: { u: Upload }){
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(u.filename)
  const [busy, setBusy] = useState(false)
  async function saveName(){
    if (name && name !== u.filename){
      setBusy(true)
      await fetch('/api/autopilot/update-upload', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ uploadId: u.id, filename: name }) })
      setBusy(false)
      try{ (window as any).location?.reload() }catch{}
    }
    setEditing(false)
  }
  return (
    <li title={u.filename} style={{display:'flex', alignItems:'center', gap:6}}>
      <span style={{flex:1, overflow:'hidden', textOverflow:'ellipsis'}}>
        {editing ? (
          <input value={name} onChange={e=> setName(e.target.value)} onBlur={saveName} onKeyDown={(e)=>{ if(e.key==='Enter') saveName() }} style={{width:'100%'}} />
        ) : (
          <span>{u.filename}</span>
        )}
      </span>
      <button onClick={()=> setEditing(v => !v)} disabled={busy}>{editing? 'Save' : 'Rename'}</button>
      <select defaultValue={u.kind} onChange={async (e)=>{
        const kind = e.target.value
        await fetch('/api/autopilot/update-upload', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ uploadId: u.id, kind }) })
      }}>
        {['rfp','prior_proposal','cv','boilerplate','budget','facilities','other'].map(v => (<option key={v} value={v}>{v}</option>))}
      </select>
      <button onClick={async ()=>{ await fetch('/api/autopilot/delete-upload', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ uploadId: u.id }) }); try{ (window as any).location?.reload() }catch{} }}>Remove</button>
    </li>
  )
}
