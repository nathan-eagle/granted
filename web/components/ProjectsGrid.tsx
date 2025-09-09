'use client'
import Link from 'next/link'
import { useToast } from '@/components/ui/Toast'

export default function ProjectsGrid({ items }: { items: { id:string; name:string; createdAt:string; meta?:any }[] }){
  const { show } = useToast()
  async function del(id: string){
    if (!confirm('Delete this project? This can be undone by support.')) return
    const r = await fetch('/api/projects/delete', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ projectId: id }) })
    if (r.ok) { show('Project deleted'); location.reload() }
    else show('Delete failed')
  }
  const visible = items.filter(p => !(p.meta as any)?.deletedAt)
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:12}}>
      {visible.map(p => (
        <div key={p.id} style={{border:'1px solid #eee', padding:12, borderRadius:8, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <Link href={`/project/${p.id}/draft`} style={{textDecoration:'none'}}>
            <div style={{fontWeight:600}}>{p.name}</div>
            <div style={{fontSize:12, color:'#666'}}>Created: {new Date(p.createdAt).toLocaleString()}</div>
          </Link>
          <button onClick={()=> del(p.id)} style={{color:'#ef4444'}}>Delete</button>
        </div>
      ))}
    </div>
  )
}

